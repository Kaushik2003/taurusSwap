import os
import re

TARGET_DIR = "/home/kzark/Documents/coding/TaurusProtocol/frontend"

def process_file(filepath):
    with open(filepath, 'r') as f:
        content = f.read()

    original_content = content
    
    # 1. Update global CSS explicitly
    if filepath.endswith("globals.css"):
        # Add new colors to theme inline
        if "--color-green:" not in content and "--color-dark-green:" not in content:
            content = content.replace("  --color-success:", "  --color-green: var(--green);\n  --color-dark-green: var(--dark-green);\n  --color-success:")
        
        # Replace root variables
        content = re.sub(r'#87E4A2', '#9FE870', content, flags=re.IGNORECASE)
        content = re.sub(r'#084734', '#163300', content, flags=re.IGNORECASE)

        # Ensure --green and --dark-green are in root
        if "--green:" not in content:
            content = content.replace("--background:", "--green: #9FE870;\n  --dark-green: #163300;\n  --background:")

    else:
        # Standard Tailwind Classes Replacements for dark-green
        content = re.sub(r'text-\[#084734\]', 'text-dark-green', content, flags=re.IGNORECASE)
        content = re.sub(r'bg-\[#084734\]', 'bg-dark-green', content, flags=re.IGNORECASE)
        content = re.sub(r'border-\[#084734\]', 'border-dark-green', content, flags=re.IGNORECASE)
        content = re.sub(r'fill-\[#084734\]', 'fill-dark-green', content, flags=re.IGNORECASE)
        content = re.sub(r'stroke-\[#084734\]', 'stroke-dark-green', content, flags=re.IGNORECASE)
        content = re.sub(r'shadow-\[([^\]]*)#084734\]', r'shadow-[\1var(--color-dark-green)]', content, flags=re.IGNORECASE)
        
        content = re.sub(r'text-\[#084734\](/[0-9]+)', r'text-dark-green\1', content, flags=re.IGNORECASE)
        content = re.sub(r'bg-\[#084734\](/[0-9]+)', r'bg-dark-green\1', content, flags=re.IGNORECASE)
        content = re.sub(r'border-\[#084734\](/[0-9]+)', r'border-dark-green\1', content, flags=re.IGNORECASE)

        # Standard Tailwind Classes Replacements for green
        content = re.sub(r'text-\[#87E4A2\]', 'text-green', content, flags=re.IGNORECASE)
        content = re.sub(r'bg-\[#87E4A2\]', 'bg-green', content, flags=re.IGNORECASE)
        content = re.sub(r'border-\[#87E4A2\]', 'border-green', content, flags=re.IGNORECASE)
        content = re.sub(r'fill-\[#87E4A2\]', 'fill-green', content, flags=re.IGNORECASE)
        content = re.sub(r'stroke-\[#87E4A2\]', 'stroke-green', content, flags=re.IGNORECASE)
        content = re.sub(r'shadow-\[([^\]]*)#87E4A2\]', r'shadow-[\1var(--color-green)]', content, flags=re.IGNORECASE)

        content = re.sub(r'text-\[#87E4A2\](/[0-9]+)', r'text-green\1', content, flags=re.IGNORECASE)
        content = re.sub(r'bg-\[#87E4A2\](/[0-9]+)', r'bg-green\1', content, flags=re.IGNORECASE)
        content = re.sub(r'border-\[#87E4A2\](/[0-9]+)', r'border-green\1', content, flags=re.IGNORECASE)
        
        # Raw value replacements in JS strings / inline styles
        content = re.sub(r'#084734', 'var(--color-dark-green)', content, flags=re.IGNORECASE)
        content = re.sub(r'#87E4A2', 'var(--color-green)', content, flags=re.IGNORECASE)

    if content != original_content:
        with open(filepath, 'w') as f:
            f.write(content)
        print(f"Updated {filepath}")

for root, _, files in os.walk(TARGET_DIR):
    for file in files:
        if file.endswith('.tsx') or file.endswith('.css'):
            process_file(os.path.join(root, file))
