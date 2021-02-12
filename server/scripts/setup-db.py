#!/usr/bin/env python3
import sys, subprocess, importlib.util, os

def install(package):
    subprocess.check_call([sys.executable, "-m", "pip", "install", package])

def call(cmd: str, env = None, silent = False):
    return bool(subprocess.call(
        cmd.split(" "), 
        env=env,
        stdout=sys.stdout if not silent else subprocess.DEVNULL))

def try_call(cmd: str, env = None, silent = False):
    try: return call(cmd, env, silent)
    except: return False

# Taken from https://stackoverflow.com/a/1724723/11953579
def find(name, path):
    for root, dirs, files in os.walk(path):
        if name in files:
            return os.path.join(root, name)
    return None

def build_db_url(config: dict):
    user = config["user"]
    secret = config["secret"]
    host = config["host"]
    port = config["port"]
    db = config["name"]
    return f"postgresql://{user}:{secret}@{host}:{port}/{db}"
    
# check sqlx
ec = try_call("sqlx --version", silent=True)
if ec != 0:
    print("Please install the sqlx CLI. https://github.com/launchbadge/sqlx/tree/master/sqlx-cli")
    exit(1)

# ensure toml is installed
if importlib.util.find_spec("toml") is None: install("toml")
import toml

config = toml.load(find("config.toml", "."))
if not config["database"]:
    print("config.toml has no field \"database\"")
    exit(1)
database_url = build_db_url(config["database"])
print(f"Setting up database '{database_url}'")
call(f"sqlx --database-url={database_url} database setup")