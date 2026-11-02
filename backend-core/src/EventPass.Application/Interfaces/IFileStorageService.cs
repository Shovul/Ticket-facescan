using Microsoft.AspNetCore.Http;

public interface IFileStorageService
{
    /// <summary>
    /// Lưu tệp tin hình ảnh vào thư mục chỉ định trên Dropbox.
    /// </summary>
    /// <param name="file">Tệp tin tải lên (IFormFile).</param>
    /// <param name="folder">Tên thư mục con bên trong /AncientBook (vd: "chat_customer", "books", "avatars").</param>
    /// <returns>Đường dẫn Direct Link (raw=1) hiển thị trực tiếp ảnh.</returns>
    Task<string> SaveFileAsync(IFormFile file, string folder);

    /// <summary>
    /// Lưu tệp sách số hóa (PDF, EPUB) lên Dropbox phục vụ E-Reader.
    /// </summary>
    /// <param name="file">Tệp sách tải lên (IFormFile).</param>
    /// <param name="folder">Tên thư mục con (vd: "ebooks").</param>
    /// <returns>Đường dẫn nội bộ trên Dropbox (vd: "/AncientBook/ebooks/filename.pdf").</returns>
    Task<string> SaveEbookAsync(IFormFile file, string folder = "ebooks");

    /// <summary>
    /// Tải nội dung tệp từ Dropbox về dưới dạng Stream để bóc tách text hoặc phục vụ AI.
    /// </summary>
    /// <param name="dropboxPath">Đường dẫn tệp nội bộ trên Dropbox.</param>
    /// <param name="ct">CancellationToken hủy tác vụ nếu cần.</param>
    /// <returns>Luồng dữ liệu Stream của tệp.</returns>
    Task<Stream> GetFileStreamAsync(string dropboxPath, CancellationToken ct = default);

    /// <summary>
    /// Xóa tệp tin trên Dropbox (nếu cần dọn dẹp bộ nhớ).
    /// </summary>
    /// <param name="fileUrl">Đường dẫn URL của file.</param>
    Task DeleteFileAsync(string fileUrl);

    Task<string> SaveBytesFileAsync(byte[] bytes, string fileName, string folder);
    Task<string> SaveRefundMediaAsync(IFormFile file, string folder);
}