using Dropbox.Api;
using Dropbox.Api.Files;
using Dropbox.Api.Sharing;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.WebUtilities;
using Microsoft.Extensions.Configuration;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;

namespace EventPass.Infrastructure.Storage
{


    public class DropboxStorageService : IFileStorageService
    {
        private readonly IConfiguration _configuration;
        private readonly string _appKey;
        private readonly string _appSecret;
        private readonly string _refreshToken;
        private readonly string _baseFolder;
        private static readonly HttpClient _httpClient = new();

        public DropboxStorageService(IConfiguration configuration)
        {
            _configuration = configuration;
            _appKey = _configuration["Dropbox:AppKey"] ?? string.Empty;
            _appSecret = _configuration["Dropbox:AppSecret"] ?? string.Empty;
            _refreshToken = _configuration["Dropbox:RefreshToken"] ?? string.Empty;
            _baseFolder = (_configuration["Dropbox:FolderPath"] ?? "/AncientBook").TrimEnd('/');
        }

        /// <summary>
        /// Chủ động lấy Access Token mới nhất từ Refresh Token qua REST API chính thức của Dropbox
        /// </summary>
        private async Task<string> GetAccessTokenAsync()
        {
            if (string.IsNullOrWhiteSpace(_appKey) ||
                string.IsNullOrWhiteSpace(_appSecret) ||
                string.IsNullOrWhiteSpace(_refreshToken))
            {
                throw new InvalidOperationException("Chưa cấu hình Dropbox. Hãy thiết lập Dropbox:AppKey, Dropbox:AppSecret và Dropbox:RefreshToken trong appsettings.Development.json hoặc User Secrets.");
            }

            var request = new HttpRequestMessage(HttpMethod.Post, "https://api.dropboxapi.com/oauth2/token");

            var authValue = Convert.ToBase64String(Encoding.UTF8.GetBytes($"{_appKey.Trim()}:{_appSecret.Trim()}"));
            request.Headers.Authorization = new AuthenticationHeaderValue("Basic", authValue);

            var parameters = new Dictionary<string, string>
            {
                { "grant_type", "refresh_token" },
                { "refresh_token", _refreshToken.Trim() }
            };

            request.Content = new FormUrlEncodedContent(parameters);

            var response = await _httpClient.SendAsync(request);
            var responseBody = await response.Content.ReadAsStringAsync();

            if (!response.IsSuccessStatusCode)
            {
                throw new InvalidOperationException($"Lỗi lấy token Dropbox ({response.StatusCode}): {responseBody}");
            }

            using var jsonDoc = JsonDocument.Parse(responseBody);
            if (jsonDoc.RootElement.TryGetProperty("access_token", out var tokenElement))
            {
                return tokenElement.GetString() ?? throw new InvalidOperationException("Access token trả về bị rỗng.");
            }

            throw new InvalidOperationException("Không tìm thấy trường access_token trong phản hồi của Dropbox.");
        }

        public async Task<string> SaveFileAsync(IFormFile file, string folder)
        {
            if (file == null || file.Length == 0)
            {
                throw new ArgumentException("Tệp tải lên không hợp lệ hoặc để trống.");
            }

            const long maxFileSize = 5 * 1024 * 1024;
            if (file.Length > maxFileSize)
            {
                throw new InvalidOperationException("Kích thước tệp vượt quá giới hạn cho phép (tối đa 5MB).");
            }

            var extension = Path.GetExtension(file.FileName).ToLowerInvariant();
            var allowedExtensions = new[] { ".png", ".jpg", ".jpeg", ".webp" };
            if (!allowedExtensions.Contains(extension))
            {
                throw new InvalidOperationException("Định dạng tệp không hợp lệ. Chỉ chấp nhận ảnh: .png, .jpg, .jpeg, .webp.");
            }

            string uniqueFileName = $"{Guid.NewGuid():N}_{DateTime.UtcNow:yyyyMMddHHmmss}{extension}";
            string subFolder = string.IsNullOrWhiteSpace(folder) ? "Attachments" : folder.Trim('/');
            string targetPath = $"/{_baseFolder.Trim('/')}/{subFolder}/{uniqueFileName}".Replace("//", "/");

            string accessToken = await GetAccessTokenAsync();
            using var client = new DropboxClient(accessToken);

            using var memoryStream = new MemoryStream();
            await file.CopyToAsync(memoryStream);
            memoryStream.Position = 0;

            await client.Files.UploadAsync(
                targetPath,
                WriteMode.Overwrite.Instance,
                body: memoryStream);

            return await GetDirectSharedLinkAsync(client, targetPath);
        }

        public async Task<string> SaveEbookAsync(IFormFile file, string folder = "ebooks")
        {
            if (file == null || file.Length == 0)
            {
                throw new ArgumentException("Tệp sách tải lên không hợp lệ hoặc để trống.");
            }

            // Hạn mức tối đa cho sách số hóa là 100MB (Theo chuẩn E2 của Use Case)
            const long maxFileSize = 100 * 1024 * 1024;
            if (file.Length > maxFileSize)
            {
                throw new InvalidOperationException("Dung lượng tệp sách vượt quá hạn mức cho phép (tối đa 100MB).");
            }

            // Kiểm tra định dạng sách số hóa (Theo chuẩn E1 của Use Case)
            var extension = Path.GetExtension(file.FileName).ToLowerInvariant();
            var allowedExtensions = new[] { ".pdf", ".epub" };
            if (!allowedExtensions.Contains(extension))
            {
                throw new InvalidOperationException("Định dạng tệp không đúng tiêu chuẩn. Nền tảng chỉ chấp nhận tệp .pdf hoặc .epub.");
            }

            string uniqueFileName = $"{Guid.NewGuid():N}_{DateTime.UtcNow:yyyyMMddHHmmss}{extension}";
            string subFolder = string.IsNullOrWhiteSpace(folder) ? "ebooks" : folder.Trim('/');
            string targetPath = $"/{_baseFolder.Trim('/')}/{subFolder}/{uniqueFileName}".Replace("//", "/");

            string accessToken = await GetAccessTokenAsync();
            using var client = new DropboxClient(accessToken);

            using var memoryStream = new MemoryStream();
            await file.CopyToAsync(memoryStream);
            memoryStream.Position = 0;

            await client.Files.UploadAsync(
                targetPath,
                WriteMode.Overwrite.Instance,
                body: memoryStream);

            // Trả về đường dẫn nội bộ để lưu vào cột DropboxPath trong bảng EbookEditions
            return targetPath;
        }

        public async Task<Stream> GetFileStreamAsync(string dropboxPath, CancellationToken ct = default)
        {
            if (string.IsNullOrWhiteSpace(dropboxPath))
            {
                throw new ArgumentException("Đường dẫn tệp Dropbox không được để trống.", nameof(dropboxPath));
            }

            // 1. Chuẩn hóa đường dẫn: đổi '\' thành '/' và đảm bảo có '/' ở đầu
            string normalizedPath = dropboxPath.Replace("\\", "/").Trim();
            if (!normalizedPath.StartsWith("/"))
            {
                normalizedPath = "/" + normalizedPath;
            }

            // 2. Nếu path lưu trong DB là đường dẫn tương đối (chưa có _baseFolder), tự bù vào
            string cleanBase = string.IsNullOrWhiteSpace(_baseFolder) ? "" : "/" + _baseFolder.Trim('/');
            if (!string.IsNullOrEmpty(cleanBase) && !normalizedPath.StartsWith(cleanBase + "/"))
            {
                normalizedPath = $"{cleanBase}{normalizedPath}".Replace("//", "/");
            }

            string accessToken = await GetAccessTokenAsync();
            using var client = new DropboxClient(accessToken);

            try
            {
                var response = await client.Files.DownloadAsync(normalizedPath);
                var memoryStream = new MemoryStream();

                using (var responseStream = await response.GetContentAsStreamAsync())
                {
                    await responseStream.CopyToAsync(memoryStream, ct);
                }

                memoryStream.Position = 0;
                return memoryStream;
            }
            catch (Dropbox.Api.ApiException<Dropbox.Api.Files.DownloadError> ex)
            {
                throw new InvalidOperationException(
                    $"Không tìm thấy tệp trên Dropbox tại đường dẫn: '{normalizedPath}'. " +
                    $"Đường dẫn gốc truyền vào: '{dropboxPath}'. Chi tiết lỗi: {ex.Message}", ex);
            }
        }

        public async Task DeleteFileAsync(string fileUrlOrPath)
        {
            if (string.IsNullOrWhiteSpace(fileUrlOrPath)) return;

            try
            {
                // 1. Chuẩn hóa đường dẫn: đổi '\' thành '/'
                string normalizedPath = fileUrlOrPath.Replace("\\", "/").Trim();

                // 2. Nếu là URL direct link (chia sẻ), bóc tách lấy đường dẫn tương đối
                if (normalizedPath.StartsWith("http://", StringComparison.OrdinalIgnoreCase) ||
                    normalizedPath.StartsWith("https://", StringComparison.OrdinalIgnoreCase))
                {
                    var uri = new Uri(normalizedPath);
                    normalizedPath = Uri.UnescapeDataString(uri.AbsolutePath);
                }

                if (!normalizedPath.StartsWith("/"))
                {
                    normalizedPath = "/" + normalizedPath;
                }

                // Đảm bảo có tiền tố _baseFolder (nếu có)
                string cleanBase = string.IsNullOrWhiteSpace(_baseFolder) ? "" : "/" + _baseFolder.Trim('/');
                if (!string.IsNullOrEmpty(cleanBase) && !normalizedPath.StartsWith(cleanBase + "/"))
                {
                    normalizedPath = $"{cleanBase}{normalizedPath}".Replace("//", "/");
                }

                string accessToken = await GetAccessTokenAsync();
                using var client = new DropboxClient(accessToken);

                // Gọi Dropbox API xóa vĩnh viễn tệp
                await client.Files.DeleteV2Async(normalizedPath);
            }
            catch (Dropbox.Api.ApiException<Dropbox.Api.Files.DeleteError> ex)
            {
                // Nếu file không còn trên Dropbox (đã bị xóa từ trước), bỏ qua không làm crash ứng dụng
                Console.WriteLine($"[Dropbox Cleanup Warning]: Không tìm thấy file cần xóa tại {fileUrlOrPath}: {ex.Message}");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[Dropbox Cleanup Error]: {ex.Message}");
            }
        }

        private static async Task<string> GetDirectSharedLinkAsync(DropboxClient client, string path)
        {
            try
            {
                var settings = new SharedLinkSettings(requestedVisibility: RequestedVisibility.Public.Instance);
                var sharedLinkMetadata = await client.Sharing.CreateSharedLinkWithSettingsAsync(path, settings);
                return ConvertToDirectLink(sharedLinkMetadata.Url);
            }
            catch (DropboxException)
            {
                var sharedLinks = await client.Sharing.ListSharedLinksAsync(path);
                var existingLink = sharedLinks.Links.FirstOrDefault();
                if (existingLink != null)
                {
                    return ConvertToDirectLink(existingLink.Url);
                }
                throw new InvalidOperationException("Không thể tạo liên kết công khai từ Dropbox.");
            }
        }

        private static string ConvertToDirectLink(string dropboxUrl)
        {
            if (string.IsNullOrEmpty(dropboxUrl)) return string.Empty;

            var uri = new UriBuilder(dropboxUrl);
            var query = QueryHelpers.ParseQuery(uri.Query);
            query.Remove("dl");
            query["raw"] = "1";
            uri.Query = string.Empty;
            return QueryHelpers.AddQueryString(uri.Uri.AbsoluteUri, query);
        }

        public async Task<string> SaveBytesFileAsync(byte[] bytes, string fileName, string folder)
        {
            if (bytes == null || bytes.Length == 0)
            {
                throw new ArgumentException("Dữ liệu tệp nhị phân không hợp lệ hoặc rỗng.");
            }

            string subFolder = string.IsNullOrWhiteSpace(folder) ? "tts-audio" : folder.Trim('/');
            string targetPath = $"/{_baseFolder.Trim('/')}/{subFolder}/{fileName}".Replace("//", "/");

            string accessToken = await GetAccessTokenAsync();
            using var client = new DropboxClient(accessToken);

            using var memoryStream = new MemoryStream(bytes);
            memoryStream.Position = 0;

            await client.Files.UploadAsync(
                targetPath,
                WriteMode.Overwrite.Instance,
                body: memoryStream);

            // Trả về Direct Link có đuôi ?raw=1 để trình duyệt stream trực tiếp
            return await GetDirectSharedLinkAsync(client, targetPath);
        }
        
        // Lưu file cho hoàn hàng
        public async Task<string> SaveRefundMediaAsync(IFormFile file, string folder)
        {
            if (file == null || file.Length == 0)
                throw new ArgumentException("Tệp tải lên không hợp lệ hoặc để trống.");

            const long maxFileSize = 50 * 1024 * 1024;
            if (file.Length > maxFileSize)
                throw new InvalidOperationException("Kích thước tệp vượt quá giới hạn (tối đa 50MB).");

            var extension = Path.GetExtension(file.FileName).ToLowerInvariant();
            var allowedExtensions = new[] { ".png", ".jpg", ".jpeg", ".webp", ".mp4", ".mov" };
            if (!allowedExtensions.Contains(extension))
                throw new InvalidOperationException("Chỉ chấp nhận ảnh (.png, .jpg, .jpeg, .webp) và video (.mp4, .mov).");

            string uniqueFileName = $"{Guid.NewGuid():N}_{DateTime.UtcNow:yyyyMMddHHmmss}{extension}";
            string subFolder = string.IsNullOrWhiteSpace(folder) ? "Refunds" : folder.Trim('/');
            string targetPath = $"/{_baseFolder.Trim('/')}/{subFolder}/{uniqueFileName}".Replace("//", "/");

            string accessToken = await GetAccessTokenAsync(); 
            using var client = new DropboxClient(accessToken);

            using var memoryStream = new MemoryStream();
            await file.CopyToAsync(memoryStream);
            memoryStream.Position = 0;

            await client.Files.UploadAsync(targetPath, WriteMode.Overwrite.Instance, body: memoryStream);

            return await GetDirectSharedLinkAsync(client, targetPath);
        }
    }
}
