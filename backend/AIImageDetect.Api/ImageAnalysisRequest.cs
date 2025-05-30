using System.Security.Cryptography;
using System.Text.Json.Serialization;
using System.Xml.Serialization;

public class ImageAnalysisRequest
{
    // Image data usable by image manipulation libraries, e.g., byte array, base64 string, etc.
    private byte[] _imageData = default!;
    private string? _imageHash;

    [JsonPropertyName("imageData")]
    [XmlElement("ImageData")]
    public byte[] ImageData
    {
        get => _imageData;
        set
        {
            _imageData = value;
            _imageHash = null; // Clear cached hash when image data changes
        }
    }

    // Image hash for caching purposes, e.g., SHA256 hash of the image data
    [JsonIgnore]
    [XmlIgnore]
    public string ImageHash
    {
        get
        {
            if (_imageHash == null && _imageData != null)
            {
                using var sha256 = SHA256.Create();
                var hashBytes = sha256.ComputeHash(_imageData);
                _imageHash = Convert.ToHexString(hashBytes);
            }
            return _imageHash ?? string.Empty;
        }
    }

    [JsonIgnore]
    [XmlIgnore]
    public int ImageSize => _imageData?.Length ?? 0;

    public override string ToString() =>
        $"ImageAnalysisRequest: Hash={ImageHash}, Size={ImageData.Length} bytes";

    public string ToBase64() => Convert.ToBase64String(_imageData);

    public void FromBase64(string base64) => ImageData = Convert.FromBase64String(base64);

    public bool IsValid()
    {
        return _imageData != null && _imageData.Length > 0;
    }

    // Automatically detect the image format based on the bytes in ImageData
    [JsonIgnore]
    [XmlIgnore]
    public string? ImageFormat
    {
        get
        {
            if (_imageData == null || _imageData.Length < 4)
                return null;

            // JPEG
            if (_imageData.Length > 3 &&
                _imageData[0] == 0xFF && _imageData[1] == 0xD8 && _imageData[^2] == 0xFF && _imageData[^1] == 0xD9)
                return "JPEG";

            // PNG
            if (_imageData.Length > 8 &&
                _imageData[0] == 0x89 && _imageData[1] == 0x50 && _imageData[2] == 0x4E && _imageData[3] == 0x47 &&
                _imageData[4] == 0x0D && _imageData[5] == 0x0A && _imageData[6] == 0x1A && _imageData[7] == 0x0A)
                return "PNG";

            // GIF
            if (_imageData.Length > 6 &&
                _imageData[0] == 0x47 && _imageData[1] == 0x49 && _imageData[2] == 0x46 &&
                _imageData[3] == 0x38 && (_imageData[4] == 0x39 || _imageData[4] == 0x37) && _imageData[5] == 0x61)
                return "GIF";

            // BMP
            if (_imageData[0] == 0x42 && _imageData[1] == 0x4D)
                return "BMP";

            // WebP (RIFF....WEBP)
            if (_imageData.Length > 12 &&
                _imageData[0] == 0x52 && _imageData[1] == 0x49 && _imageData[2] == 0x46 && _imageData[3] == 0x46 &&
                _imageData[8] == 0x57 && _imageData[9] == 0x45 && _imageData[10] == 0x42 && _imageData[11] == 0x50)
                return "WebP";

            return "Unknown";
        }
    }
}