import os

# Color codes
BLUE = "\033[94m"
GREEN = "\033[92m"
RESET = "\033[0m"

def list_files(path, indent=""):
    for item in os.listdir(path):
        full_path = os.path.join(path, item)
        if os.path.isdir(full_path):
            print(f"{indent}{BLUE}[DIR] {item}{RESET}")
            list_files(full_path, indent + "  ")
        elif os.path.isfile(full_path):
            print(f"{indent}{GREEN}{item}{RESET}")

# Change '.' to any directory you want to scan
list_files(".")
