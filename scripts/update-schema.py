#!/usr/bin/env python3
import os, sys, subprocess, glob, errno, os.path
from pathlib import Path

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

print("Processing schemas")
print("...deleting old schemas")
for f in Path("common/net/schema").rglob("*.ts"):
    os.remove(f)

print("...compiling schemas")
call("packetc ts common/net/schema common/net/schema")

# all the compiled schemas in src/schemas need to be re-exported
# this globs the generated filenames, and generates exports for them
# and outputs it to a "index.ts" file in src/schemas

def files(dir: str, ext: str):
    out = []
    for (_,_,files) in os.walk(dir):
        for file in files:
            if os.path.splitext(os.path.basename(file))[1] == ext:
                out.append(file)
        break
    return out

def dirs(dir: str):
    out = []
    for (_,dirs,_) in os.walk(dir):
        out.extend(dirs)
        break
    return out

def format_export(full_path: str):
    filename = os.path.splitext(os.path.basename(full_path))[0]
    export = filename.title()
    return (export, filename)

def format_prefix(dir: str):
    ''' action/test/asdf
    '''
    out = ""
    for part in dir.split(os.pathsep):
        if part != "":
            out += f'{part.title()}.'
    return out

def local_export(dir: str, sdir: str, ctx: dict, root: str):
    index = ""
    # recursively export each sub-directory
    for subdir in dirs(dir):
        index += f'import * as {subdir.title()} from "./{subdir}";\n'
        index += f'export * as {subdir.title()} from "./{subdir}";\n'
        local_export(
            os.path.join(dir, subdir), 
            os.path.join(sdir, subdir), 
            ctx, 
            root)
    # then export each .ts file + save its name in ctx
    exports = [format_export(file) for file in files(dir, ".ts")]
    for (export, filename) in exports:
        index += f'export {{ {export} }} from "./{filename}";\n' 
        prefix = format_prefix(sdir)
        ctx["names"].append((f'{prefix}Id.{export}', f'{export}'))
    # write ids
    index += "export const enum Id {\n"
    for (export, _) in exports: 
        ctx["id"] += 1
        index += f'    {export} = {ctx["id"] - 1},\n'
    index += "}\n"
    # if we're in ROOT, then also export max ID and names
    if dir == root:
        index += f'export const ID_MAX = {ctx["id"]};\n'
        # write packet names
        index += "export const Name = Object.freeze({\n"
        for (id, name) in ctx["names"]:
            index += f'    [{id}]: "{name}",\n'
        index += "});\n"
        index += "export type Name = typeof Name;\n"
    with safe_open_w(dir + "/index.ts") as file:
        file.write(index)

def write_exports(dir: str):
    local_export(dir, "", { "id": 0, "names": [] }, dir)

print("...writing index files")
write_exports("common/net/schema")
print("Done.")