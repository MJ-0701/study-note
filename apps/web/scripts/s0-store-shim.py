#!/usr/bin/env python3
"""S0 store-shim transformer: rewrite main.ts bare-singleton reads/writes to
Zustand accessor calls. String/comment/template-interpolation aware. Brace-
matched write wrapping. One-shot; reviewed via git diff + tsc + spec suite."""
import sys

VARS = {
    "notebook": ("getNotebook", "setNotebook"),
    "pdfWorkspaceStore": ("getPdfWorkspaceStore", "setPdfWorkspaceStore"),
    "authSession": ("getAuthSession", "setAuthSession"),
    "authMode": ("getAuthMode", "setAuthMode"),
    "inspectorOpen": ("getInspectorOpen", "setInspectorOpen"),
    "intakeFeedback": ("getIntakeFeedback", "setIntakeFeedback"),
    "loginFeedback": ("getLoginFeedback", "setLoginFeedback"),
    "pendingPdfRetry": ("getPendingPdfRetry", "setPendingPdfRetry"),
    "quickNote": ("getQuickNote", "setQuickNote"),
}
IDC = set("abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_$")

path = sys.argv[1]
s = open(path).read()
n = len(s)
out = []
i = 0
depth = 0                 # source bracket nesting () {} []
pending = []              # stack of depths where a setX( was opened (close at ';')
# mode stack: each frame is ("code",) or ("tmpl",) ; code frames spawned by ${
# carry a brace counter so the matching } pops back to template.
mode = [("code", 0)]      # (kind, brace_balance_for_tmpl_code_frame)


def prev_sig():
    """last non-space char already emitted (to detect member access '.')."""
    for c in reversed(out):
        if c not in " \t":
            return c
    return ""


def trailing_dot_run():
    """count of consecutive trailing '.' chunks: 1 = member access (skip),
    3 = spread (a real read, replace), 0 = neither."""
    cnt = 0
    for c in reversed(out):
        if c == ".":
            cnt += 1
        else:
            break
    return cnt


while i < n:
    kind = mode[-1][0]
    c = s[i]

    if kind == "tmpl":
        # template literal text: copy verbatim until ` or ${
        if c == "\\":
            out.append(s[i:i+2]); i += 2; continue
        if c == "`":
            out.append(c); i += 1; mode.pop(); continue
        if c == "$" and i + 1 < n and s[i+1] == "{":
            out.append("${"); i += 2; mode.append(["code_tmpl", 0]); continue
        out.append(c); i += 1; continue

    # --- code (top-level or inside ${}) ---
    # comments
    if c == "/" and i + 1 < n and s[i+1] == "/":
        j = s.find("\n", i)
        if j == -1: j = n
        out.append(s[i:j]); i = j; continue
    if c == "/" and i + 1 < n and s[i+1] == "*":
        j = s.find("*/", i + 2)
        j = n if j == -1 else j + 2
        out.append(s[i:j]); i = j; continue
    # strings
    if c == '"' or c == "'":
        q = c; j = i + 1
        while j < n:
            if s[j] == "\\": j += 2; continue
            if s[j] == q: j += 1; break
            j += 1
        out.append(s[i:j]); i = j; continue
    # template start
    if c == "`":
        out.append(c); i += 1; mode.append(("tmpl", 0)); continue
    # brackets / depth + template-code brace pop
    if c in "([":
        depth += 1; out.append(c); i += 1; continue
    if c in ")]":
        depth -= 1; out.append(c); i += 1; continue
    if c == "{":
        depth += 1
        if mode[-1][0] == "code_tmpl":
            mode[-1][1] += 1
        out.append(c); i += 1; continue
    if c == "}":
        # closing of a ${ } interpolation?
        if mode[-1][0] == "code_tmpl" and mode[-1][1] == 0:
            out.append(c); i += 1; mode.pop(); continue
        depth -= 1
        if mode[-1][0] == "code_tmpl":
            mode[-1][1] -= 1
        out.append(c); i += 1; continue
    if c == ";":
        out.append(c); i += 1
        # close any assignment opened at the current depth
        while pending and pending[-1] == depth:
            pending.pop()
            # insert ')' right before the ';' just emitted
            semi = out.pop()
            out.append(")")
            out.append(semi)
        continue
    # identifier?
    if c in IDC and not c.isdigit():
        j = i
        while j < n and s[j] in IDC:
            j += 1
        word = s[i:j]
        if word in VARS and trailing_dot_run() != 1:
            getter, setter = VARS[word]
            # lookahead for assignment: next significant char is '=' not '==' '=>' '<=' '>=' '!=' etc.
            k = j
            while k < n and s[k] in " \t":
                k += 1
            is_write = (
                k < n and s[k] == "=" and
                (k + 1 >= n or s[k+1] not in "=>") and
                prev_sig() not in "=<>!+-*/%&|^"
            )
            if is_write:
                out.append(setter + "(")
                i = k + 1            # consume up to and including '='
                pending.append(depth)
                continue
            else:
                out.append(getter + "()")
                i = j
                continue
        out.append(word); i = j; continue
    out.append(c); i += 1

open(path, "w").write("".join(out))
print("done; pending unclosed:", pending)
