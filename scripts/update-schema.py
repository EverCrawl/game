#!/usr/bin/env python3
import os, sys, subprocess, shutil, glob, errno, os.path

def call(cmd: str, env = None, silent = False):
    return bool(subprocess.call(
        cmd.split(" "), env=env,
        stdout=sys.stdout if not silent else subprocess.DEVNULL))

def try_call(cmd: str, env = None, silent = False):
    try: return call(cmd, env, silent)
    except: return False

# Taken from https://stackoverflow.com/a/23794010/11953579
def mkdir_p(path):
    try: os.makedirs(path)
    except OSError as exc: # Python >2.5
        if exc.errno == errno.EEXIST and os.path.isdir(path): pass
        else: raise

# Also taken from https://stackoverflow.com/a/23794010/11953579
def safe_open_w(path):
    ''' Open "path" for writing, creating any parent directories as needed.
    '''
    mkdir_p(os.path.dirname(path))
    return open(path, 'w')

print("Checking for packetc")
ec = try_call("packetc --help", silent=True)
if ec != 0:
    print("...packetc not found, installing it")
    call("cargo install --git https://github.com/EverCrawl/packetc.git")
else:
    print("...packetc found")

print("Processing client schemas")
os.chdir("client")

print("...deleting old schemas")
if os.path.isdir("src/schemas"): shutil.rmtree("src/schemas")

print("...compiling schemas")
call("packetc ts ../schemas src/schemas")

# all the compiled schemas in src/schemas need to be re-exported
# this globs the generated filenames, and generates exports for them
# and outputs it to a "index.ts" file in src/schemas
print("...writing index file")
index = ""
for file in glob.glob("src/schemas/*.ts"):
    filename = os.path.splitext(os.path.basename(file))[0]
    export = filename.title()
    index += f"export * as {export} from \"./{filename}\";\n"
with safe_open_w("src/schemas/index.ts") as f: f.write(index)
os.chdir("..")
print("Done.")

print("Processing server schemas")
os.chdir("server")

print("...deleting old schemas")
if os.path.isdir("src/schemas"): shutil.rmtree("src/schemas")

print("...compiling schemas")
call("packetc rust ../schemas src/schemas")

print("...writing module file")
# same as above, but the output is a "mod.rs" file
index = ""
for file in glob.glob("src/schemas/*.rs"):
    filename = os.path.splitext(os.path.basename(file))[0]
    index += f"pub mod {filename};\n"
with safe_open_w("src/schemas/mod.rs") as f: f.write(index)

os.chdir("..")
print("Done.")