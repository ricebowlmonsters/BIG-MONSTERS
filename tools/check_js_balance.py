import sys
from pathlib import Path
p = Path(sys.argv[1])
s = p.read_text(encoding='utf-8')
stack = []
line = 1
i = 0
state = 'code'  # code, single_quote, double_quote, backtick, line_comment, block_comment
while i < len(s):
    ch = s[i]
    nxt = s[i+1] if i+1 < len(s) else ''
    if ch == '\n':
        line += 1
    if state == 'code':
        if ch == '/' and nxt == '/':
            state = 'line_comment'
            i += 1
        elif ch == '/' and nxt == '*':
            state = 'block_comment'
            i += 1
        elif ch == "'":
            state = 'single_quote'
        elif ch == '"':
            state = 'double_quote'
        elif ch == '`':
            state = 'backtick'
        elif ch in '([{':
            stack.append((ch, line))
        elif ch in ')]}':
            if not stack:
                print(f'Unmatched closing {ch} at line {line}')
                sys.exit(1)
            top, ltop = stack.pop()
            pairs = {')':'(', ']':'[', '}':'{'}
            if top != pairs[ch]:
                print(f'Mismatch {top} opened at line {ltop} vs {ch} at line {line}')
                sys.exit(1)
    elif state == 'line_comment':
        if ch == '\n': state = 'code'
    elif state == 'block_comment':
        if ch == '*' and nxt == '/': state = 'code'; i += 1
    elif state == 'single_quote':
        if ch == '\\': i += 1
        elif ch == "'": state = 'code'
        elif ch == '\n':
            print(f'Unterminated single quote starting before line {line}')
            sys.exit(1)
    elif state == 'double_quote':
        if ch == '\\': i += 1
        elif ch == '"': state = 'code'
        elif ch == '\n':
            print(f'Unterminated double quote starting before line {line}')
            sys.exit(1)
    elif state == 'backtick':
        if ch == '\\': i += 1
        elif ch == '`': state = 'code'
    i += 1

if state != 'code':
    print('File ended inside a string/comment:', state)
    sys.exit(1)
if stack:
    for ch, ln in stack:
        print(f'Unclosed {ch} opened at line {ln}')
    sys.exit(1)
print('All brackets and strings appear balanced')
