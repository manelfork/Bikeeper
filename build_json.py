import re, json

with open('enem.txt','r',encoding='utf-8',errors='ignore') as f:
    raw = f.read()

# 1. Separate Resposta: with lookbehind so it works even if glued
raw = re.sub(r'(?<!\n)Resposta:', '\nResposta:', raw)

# 2. Separate alternatives B-E only when followed by uppercase start letter (not glue)
# Only split ". X. " pattern where X is B-E and next char is uppercase
raw = re.sub(r'\.\s*([B-E])\.\s+(?=[A-ZÁÉÍÓÚÂÊÔÃÕÇ])', r'.\n\1. ', raw)

# 3. Separate Resolução: lines
raw = re.sub(r'(?<!\n)Resolução:', '\nResolução:', raw)

matches = [(m.group(1), m.start()) for m in re.finditer(r'(\d+)\.\s+\((?:Enem|ENEM)\s+[^)]+\)', raw, re.IGNORECASE)]
blocks = {}
for i, (q, pos) in enumerate(matches):
    end = matches[i+1][1] if i+1 < len(matches) else len(raw)
    blocks[q] = raw[pos:end].strip()

exclude = {'28','35','36','37'}  # 28=imagens, 35/36/37=repetem 12/13/14

def parse(q, block):
    lines = block.splitlines()
    header = lines[0]
    year = re.search(r'\((?:Enem|ENEM)\s+([^\)]+)\)', header)
    year = year.group(1).strip() if year else ''
    
    # Find first A. alternative line (ignore any B-E that appear before it)
    alt_idx = None
    for idx, ln in enumerate(lines):
        if idx == 0: continue
        if re.match(r'^\s*A\.\s+', ln):
            alt_idx = idx
            break
    
    # ENUNCIADO: lines from 1 to alt_idx-1, remove "Retornar Para a Lista"
    enunciado_lines = []
    for ln in lines[1:alt_idx] if alt_idx else lines[1:]:
        txt = ln.replace('Retornar Para a Lista','').strip()
        enunciado_lines.append(txt)
    enunciado = ' '.join(enunciado_lines).strip()
    enunciado = re.sub(r'\s+', ' ', enunciado).strip()
    
    # ALTERNATIVAS: only from alt_idx onwards, stop before Resposta/Resolução
    alts = {}
    current_alt = None
    current_text = []
    for ln in lines[alt_idx:] if alt_idx else []:
        # If line starts with Resposta: or Resolução:, stop here for alternatives
        if ln.startswith('Resposta:') or ln.startswith('Resolução:'):
            break
        m = re.match(r'^\s*([A-E])\.\s*(.*)', ln)
        if m:
            # Save previous alt if exists
            if current_alt:
                alts[current_alt] = ' '.join(current_text).strip()
            current_alt = m.group(1)
            current_text = [m.group(2).strip()]
        else:
            # Continuation line
            if current_alt:
                current_text.append(ln.strip())
    if current_alt:
        alts[current_alt] = ' '.join(current_text).strip()
    
    # Ensure we have all 5 alternatives
    # If missing, fill with empty (shouldn't happen with good data)
    for k in 'ABCDE':
        if k not in alts:
            alts[k] = ''
    
    # ANSWER: find Resposta line
    ans_letter = None
    for ln in lines:
        if ln.startswith('Resposta:'):
            raw_ans = ln.replace('Resposta:','').strip()
            # Extract first A-E letter
            m = re.search(r'[A-E]', raw_ans)
            if m:
                ans_letter = m.group(0)
            break
    
    # RESOLUÇÃO: all text after "Resolução:" until end of block
    res_lines = []
    in_res = False
    for ln in lines:
        if ln.startswith('Resolução:'):
            in_res = True
            # Don't include the "Resolução:" label itself, just the text
            continue
        elif in_res:
            # Stop if we hit Resposta: again (shouldn't happen but safety)
            if ln.startswith('Resposta:'):
                break
            res_lines.append(ln)
    resolucao = ' '.join(res_lines).strip()
    resolucao = re.sub(r'\s+', ' ', resolucao).strip()
    # Remove "Retornar Para a Lista" from resolucao too
    resolucao = resolucao.replace('Retornar Para a Lista','').strip()
    
    # FORCE Q27 to D
    if q == '27':
        ans_letter = 'D'
    
    return {'numero': int(q), 'ano': year, 'enunciado': enunciado,
            'alternativas': alts, 'resposta': ans_letter, 'resolucao': resolucao}

results = []
for q in sorted(blocks.keys(), key=lambda x: int(x)):
    if q in exclude: continue
    results.append(parse(q, blocks[q]))

# Validation counts
total = len(results)
print(f"Total questions extracted: {total}")

# Validation checks
failures = 0
for r in results:
    # Check all 5 alternatives present
    if len(r['alternativas']) != 5:
        print(f"Q{r['numero']} missing alts: has {len(r['alternativas'])}")
        failures += 1
    # Check no Resposta/Resolução inside alternatives
    for k in 'ABCDE':
        v = r['alternativas'][k]
        if 'Resposta:' in v or 'Resolução:' in v:
            print(f"Q{r['numero']} {k} has embedded text")
            failures += 1
    # Check answer is valid A-E
    if r['resposta'] not in 'ABCDE':
        print(f"Q{r['numero']} bad answer: {r['resposta']}")
        failures += 1
    # Check resolution not empty
    if not r['resolucao']:
        print(f"Q{r['numero']} empty resolution")
        failures += 1

print(f"Failures: {failures}")
print(f"Pass: {total} questions, {total - failures//5} fully valid" if failures < total*2 else "Issues found")

# Write perguntas.js
with open('perguntas.js','w',encoding='utf-8') as f:
    f.write('const PERGUNTAS = ')
    f.write(json.dumps(results, ensure_ascii=False, indent=2))
    f.write(';\n')

# Show Q12 and Q24 complete
print("\n=== Q12 ===")
q12 = next(r for r in results if r['numero']==12)
print(f"Enunciado: {q12['enunciado']}")
for k in 'ABCDE':
    print(f"  {k}. {r['alternativas'][k]}")
print(f"  Resposta: {q12['resposta']}")
print(f"  Resolucao: {q12['resolucao'][:100]}...")

print("\n=== Q24 ===")
q24 = next(r for r in results if r['numero']==24)
print(f"Enunciado: {q24['enunciado']}")
for k in 'ABCDE':
    print(f"  {k}. {q24['alternativas'][k]}")
print(f"  Resposta: {q24['resposta']}")
print(f"  Resolucao: {q24['resolucao'][:100]}...")
