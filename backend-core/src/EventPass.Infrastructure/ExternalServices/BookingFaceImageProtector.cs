using EventPass.Application.Interfaces;
using Microsoft.AspNetCore.DataProtection;

namespace EventPass.Infrastructure.ExternalServices;

public class BookingFaceImageProtector(IDataProtectionProvider provider) : IBookingFaceImageProtector
{
    private readonly IDataProtector protector = provider.CreateProtector("EventPass.Booking.FaceImage.v1");
    public byte[] Unprotect(byte[] image) => protector.Unprotect(image);
    public byte[] Protect(byte[] image) => protector.Protect(image);
}
