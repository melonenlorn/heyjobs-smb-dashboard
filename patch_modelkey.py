import json, sys

PATH = '/Users/ferdinandbarenfanger/heyjobs-smb-dashboard/pages/Dashboard/widgets/Rep_Table.json'

OLD = 'function modelKey(m) {\\n\\t\\t\\t\\treturn (m && m.reps || []).reduce(function(s,r){ return s+(r.bookingsTarget||0); }, 0);\\n\\t\\t\\t}'
NEW = 'function modelKey(m) {\\n\\t\\t\\t\\treturn (m && m.reps || []).reduce(function(s,r){ return s+(r.bookingsARR||0)+(r.dials||0); }, 0);\\n\\t\\t\\t}'

with open(PATH, 'r', encoding='utf-8') as f:
    raw = f.read()

count = raw.count(OLD)
if count == 0:
    print("ERROR: pattern not found — checking with repr:")
    # find modelKey context
    idx = raw.find('function modelKey')
    if idx == -1:
        print("modelKey not found at all")
        sys.exit(1)
    print(repr(raw[idx:idx+200]))
    sys.exit(1)

new_raw = raw.replace(OLD, NEW)
print(f"Replaced {count} occurrence(s)")

with open(PATH, 'w', encoding='utf-8') as f:
    f.write(new_raw)
print("Done.")
