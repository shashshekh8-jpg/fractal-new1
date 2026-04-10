import os
import re

def build_codebase(input_txt_path, target_dir):
    try:
        with open(input_txt_path, 'r', encoding='utf-8') as f:
            lines = f.readlines()
    except FileNotFoundError:
        print(f"Error: Could not find '{input_txt_path}'. Please ensure the file is in the same directory.")
        return

    # Regex to match the file headers (e.g., "### 1. `.gitignore`" or "### 37. `frontend/src/hooks/useFractal.ts`")
    header_pattern = re.compile(r"^###\s+\d+\.\s+`([^`]+)`")
    # Regex to remove the tags injected by the document system
    source_tag_pattern = re.compile(r"\\s*")

    current_file = None
    file_lines = []

    # Ensure target directory exists
    os.makedirs(target_dir, exist_ok=True)

    def save_current_file():
        if current_file:
            # Clean up the file path (remove "fractal-main/" if the header accidentally includes it)
            clean_path = current_file.replace("fractal-main/", "")
            filepath = os.path.join(target_dir, clean_path)
            
            # Create subdirectories if they don't exist
            os.makedirs(os.path.dirname(filepath), exist_ok=True)

            # Combine lines and clean up the tags
            content = "".join(file_lines)
            content = source_tag_pattern.sub("", content)

            # Clean up markdown code block fences (```rust, ```tsx, etc.)
            content = content.strip()
            if content.startswith("```"):
                first_newline = content.find("\n")
                if first_newline != -1:
                    content = content[first_newline+1:]
            
            if content.endswith("```"):
                content = content[:-3].rstrip()

            # Write the file to disk
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(content + "\n")
            
            print(f"Created: {filepath}")

    print(f"Unloading codebase into {os.path.abspath(target_dir)}...\n")

    # Iterate through the text file and parse
    for line in lines:
        match = header_pattern.search(line)
        if match:
            # Save the previous file before starting the new one
            save_current_file()
            
            current_file = match.group(1)
            file_lines = []
        elif current_file is not None:
            file_lines.append(line)

    # Don't forget to save the very last file in the loop
    save_current_file()
    print("\n✅ Codebase successfully unloaded!")

if __name__ == "__main__":
    # Name of the text file containing the codebase
    INPUT_FILE = "codebase-directory.txt" 
    
    # The output folder where the project will be built
    TARGET_DIRECTORY = "./fractal-main"
    
    build_codebase(INPUT_FILE, TARGET_DIRECTORY)
