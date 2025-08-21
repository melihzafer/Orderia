#!/usr/bin/env python3

import os
from PIL import Image, ImageDraw, ImageFont

# Android icon sizes and their corresponding directories
icon_sizes = {
    'mipmap-mdpi': 48,
    'mipmap-hdpi': 72,
    'mipmap-xhdpi': 96,
    'mipmap-xxhdpi': 144,
    'mipmap-xxxhdpi': 192
}

def create_android_icon(size, background_color="#5747d6"):
    """Create an Android icon with the Orderia logo based on the provided design"""
    # Create a new image with the specified size and gradient background
    icon = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(icon)
    
    # Create gradient background (purple gradient like in the provided image)
    for y in range(size):
        # Gradient from lighter purple to darker purple
        ratio = y / size
        r = int(135 + (71 - 135) * ratio)  # From #8771d6 to #4732a6
        g = int(113 + (50 - 113) * ratio)
        b = int(214 + (166 - 214) * ratio)
        color = (r, g, b, 255)
        draw.line([(0, y), (size, y)], fill=color)
    
    # Create the plate (main circular element)
    plate_margin = size // 6
    plate_size = size - (2 * plate_margin)
    
    # White/light gray plate with shadow effect
    shadow_offset = size // 40
    # Shadow
    draw.ellipse([plate_margin + shadow_offset, plate_margin + shadow_offset, 
                  plate_margin + plate_size + shadow_offset, plate_margin + plate_size + shadow_offset], 
                fill=(0, 0, 0, 30))
    
    # Main plate
    draw.ellipse([plate_margin, plate_margin, plate_margin + plate_size, plate_margin + plate_size], 
                fill="#f8f8f8", outline="#e8e8e8", width=max(1, size // 100))
    
    # Inner rim for depth
    rim_width = max(2, size // 50)
    draw.ellipse([plate_margin + rim_width, plate_margin + rim_width, 
                  plate_margin + plate_size - rim_width, plate_margin + plate_size - rim_width], 
                outline="#e0e0e0", width=max(1, size // 120))
    
    # Add "Orderia" text in the center
    try:
        # Try to use a better font if available
        font_size = max(10, size // 10)
        try:
            font = ImageFont.truetype("arial.ttf", font_size)
        except:
            font = ImageFont.load_default()
        
        text = "Orderia"
        
        # Get text dimensions
        bbox = draw.textbbox((0, 0), text, font=font)
        text_width = bbox[2] - bbox[0]
        text_height = bbox[3] - bbox[1]
        
        # Center the text
        text_x = (size - text_width) // 2
        text_y = (size - text_height) // 2
        
        # Draw text with subtle shadow
        shadow_color = "#c0c0c0"
        text_color = "#999999"
        
        # Text shadow
        draw.text((text_x + 1, text_y + 1), text, fill=shadow_color, font=font)
        # Main text
        draw.text((text_x, text_y), text, fill=text_color, font=font)
        
    except Exception as e:
        print(f"Font rendering error: {e}")
        # Fallback - simple text
        pass
    
    return icon

def main():
    # Create directories if they don't exist
    base_path = os.path.join("android", "app", "src", "main", "res")
    
    for directory, size in icon_sizes.items():
        dir_path = os.path.join(base_path, directory)
        os.makedirs(dir_path, exist_ok=True)
        
        # Create launcher icon
        icon = create_android_icon(size)
        icon_path = os.path.join(dir_path, "ic_launcher.png")
        icon.save(icon_path, "PNG")
        print(f"Created {icon_path}")
        
        # Create round launcher icon (same design)
        round_icon_path = os.path.join(dir_path, "ic_launcher_round.png")
        icon.save(round_icon_path, "PNG")
        print(f"Created {round_icon_path}")
        
        # Create foreground icon (for adaptive icons)
        # Foreground should be just the plate without background
        foreground_icon = Image.new('RGBA', (size, size), (0, 0, 0, 0))
        fg_draw = ImageDraw.Draw(foreground_icon)
        
        # Scale the plate to fit foreground requirements (usually 66% of icon size)
        fg_margin = size // 4
        fg_size = size - (2 * fg_margin)
        
        # White plate
        fg_draw.ellipse([fg_margin, fg_margin, fg_margin + fg_size, fg_margin + fg_size], 
                       fill="#f8f8f8", outline="#e8e8e8", width=max(1, size // 100))
        
        # Add "Orderia" text
        try:
            font_size = max(8, size // 12)
            try:
                font = ImageFont.truetype("arial.ttf", font_size)
            except:
                font = ImageFont.load_default()
            
            text = "Orderia"
            bbox = fg_draw.textbbox((0, 0), text, font=font)
            text_width = bbox[2] - bbox[0]
            text_height = bbox[3] - bbox[1]
            
            text_x = (size - text_width) // 2
            text_y = (size - text_height) // 2
            
            fg_draw.text((text_x, text_y), text, fill="#999999", font=font)
        except:
            pass
        
        foreground_path = os.path.join(dir_path, "ic_launcher_foreground.png")
        foreground_icon.save(foreground_path, "PNG")
        print(f"Created {foreground_path}")

    print("\nAndroid icons updated successfully with Orderia logo!")

if __name__ == "__main__":
    main()
