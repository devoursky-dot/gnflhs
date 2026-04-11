import sys

path = r'c:\react-projects\gnflhs\app\preview\[appId]\page.tsx'

try:
    with open(path, 'rb') as f:
        content = f.read()
    
    print(f"File size: {len(content)} bytes")
    
    try:
        content.decode('utf-8')
        print("File is valid UTF-8 according to Python decode().")
    except UnicodeDecodeError as e:
        print(f"UnicodeDecodeError: {e}")
        start = max(0, e.start - 20)
        end = min(len(content), e.end + 20)
        print(f"Context (hex) at {e.start}: {content[start:end].hex()}")
        print(f"Context (bytes) at {e.start}: {content[start:end]}")
        
        # Try to fix by replacing invalid bytes with space or nothing
        fixed_content = content[:e.start] + b' ' + content[e.end:]
        # Note: This only fixes one error. There might be more.
        # Let's try replacing all 
        fixed_content = content.decode('utf-8', errors='replace').encode('utf-8')
        
        with open(path + '.fixed', 'wb') as f:
            f.write(fixed_content)
        print(f"Saved fixed version to {path + '.fixed'}")

except Exception as ex:
    print(f"Error: {ex}")
