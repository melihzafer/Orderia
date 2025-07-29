#!/usr/bin/env python3
"""Create proper PNG asset files for Expo app"""

import struct
import zlib

def create_png(width, height, r, g, b, filename):
    """Create a simple solid color PNG file"""
    
    # PNG signature
    png_signature = b'\x89\x50\x4E\x47\x0D\x0A\x1A\x0A'
    
    # IHDR chunk
    ihdr_data = struct.pack('>IIBBBBB', width, height, 8, 2, 0, 0, 0)
    ihdr_crc = zlib.crc32(b'IHDR' + ihdr_data) & 0xffffffff
    ihdr_chunk = struct.pack('>I', len(ihdr_data)) + b'IHDR' + ihdr_data + struct.pack('>I', ihdr_crc)
    
    # IDAT chunk (image data)
    # Create pixel data (RGB, no alpha)
    pixels = []
    for y in range(height):
        row = [0]  # Filter type (None)
        for x in range(width):
            row.extend([r, g, b])
        pixels.extend(row)
    
    # Compress pixel data
    pixel_data = bytes(pixels)
    compressed_data = zlib.compress(pixel_data)
    
    idat_crc = zlib.crc32(b'IDAT' + compressed_data) & 0xffffffff
    idat_chunk = struct.pack('>I', len(compressed_data)) + b'IDAT' + compressed_data + struct.pack('>I', idat_crc)
    
    # IEND chunk
    iend_crc = zlib.crc32(b'IEND') & 0xffffffff
    iend_chunk = struct.pack('>I', 0) + b'IEND' + struct.pack('>I', iend_crc)
    
    # Write PNG file
    with open(filename, 'wb') as f:
        f.write(png_signature)
        f.write(ihdr_chunk)
        f.write(idat_chunk)
        f.write(iend_chunk)
    
    print(f"Created {filename} ({width}x{height})")

# Create asset files
create_png(1024, 1024, 32, 136, 203, 'assets/icon.png')
create_png(1024, 1024, 32, 136, 203, 'assets/adaptive-icon.png')
create_png(1284, 2778, 32, 136, 203, 'assets/splash.png')
create_png(48, 48, 32, 136, 203, 'assets/favicon.png')

print("All PNG assets created successfully!")
