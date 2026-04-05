# Marquis v1 — Post-mortem

**Data**: 2026-04-05
**Stack**: HTML + CSS + JS vanilla, marked, DOMPurify, Literata, GitHub Pages, Service Worker PWA
**Output**: app operacional em https://lpduarte.github.io/marquis, 12 ficheiros, ~500 linhas de código, instalável, offline-capable, acessível (ish), multi-tema, multi-ícone, com identidade tipográfica própria

Este documento não celebra o que ficou pronto. Celebra os erros, os detours, as decisões mal tomadas e as coisas que podíamos ter feito melhor — pelos dois lados. É escrito sem diplomacia porque foi pedido sem diplomacia.

---

## 1. Sumário honesto

O Marquis v1 é, objetivamente, uma app sólida, coerente, com carácter. Funciona. É instalável. É bonita. Resolve o problema que queria resolver.

Mas **o processo de lá chegar foi mais caótico do que precisava de ser**. Se eu fosse um gestor de projeto a olhar para esta sessão de fora, diria algo como: "Eles chegaram lá, mas fizeram três voltas desnecessárias, não testaram em mobile até alguém reportar, mudaram de ideia sobre o scope múltiplas vezes, e na última meia hora ainda estavam a limpar dívida técnica que tinha sido criada duas horas antes."

Tudo isto é corrigível. E é o propósito deste documento: identificar os padrões para não os repetir.

---

## 2. O que correu mal

### 2.1 Ausência total de spec ou definição de v1

Este é o problema estrutural maior, e tudo o resto deriva daqui.

**O que aconteceu**: o projeto começou sem uma linha escrita a definir o que era "v1". Foi crescendo por associação: leitor → temas → barra de progresso → animação de entrada → favicon SVG → tagline → PWA → acessibilidade → ícone sépia → footer link → apple-touch-icon → ajustes de contraste → safe-area → etc.

Cada um destes passos foi acertado isoladamente. Coletivamente, são scope creep.

**Consequência prática**: em nenhum momento da sessão houve uma resposta possível à pergunta "estamos prontos?". A v1 terminou não porque um critério foi cumprido, mas porque o utilizador se cansou e disse "acho que a v1 está fechada". É a pior forma de encerrar um milestone — por exaustão em vez de por definição.

**Porque é grave**: a v2 herda este problema multiplicado. Sem linha clara entre "v1" e "o que sobra", cada nova ideia vai pedir a mesma discussão: "isto é v1.1, v2, ou feature future?". E pior — não há nenhum registo do que foi decidido *não fazer* na v1, portanto ideias rejeitadas vão voltar vestidas com outra cara.

**Como fazer diferente**: antes da próxima linha de código, gastar 10 minutos a escrever um `SPEC.md` com três secções:
- **O que isto é** (o problema resolvido, em 2-3 frases)
- **O que pertence à v1** (lista fechada de funcionalidades)
- **O que explicitamente não pertence à v1** (funcionalidades descartadas ou adiadas, com razão)

Este exercício parece burocrático para um projeto pessoal. Não é. É a diferença entre "terminar um projeto" e "cansar-se de um projeto".

---

### 2.2 Deploy-first, debug-later — o pior feedback loop possível

**O que aconteceu**: praticamente todas as verificações visuais foram feitas via https://lpduarte.github.io/marquis após commit + push + GitHub Pages rebuild (~1 minuto por ciclo). Multiplicado por dezenas de iterações durante a sessão, isto consome tempo significativo e — pior — disfarça bugs.

**A ironia**: o README que escrevemos recomenda `python3 -m http.server 8000` para desenvolvimento local. **Nunca o usámos nós próprios**. Escrevemos a boa prática na documentação para os outros e ignorámo-la. Isto é hipocrisia de desenvolvimento.

**Combinado com service worker cache-first**, muitas verificações exigiram hard refresh múltiplo (Cmd+Shift+R). O SW fazia sentido para produção mas era ruído para desenvolvimento. Em alguns momentos não era claro se o problema era o código novo ou cache do SW antigo.

**Sintoma concreto**: o bug do posicionamento dos pontos do título (line-height 1.75 herdado vs 1.25 do preview) só foi detetado depois de o utilizador reportar visualmente com screenshot. Se tivesse visto no contexto real antes de declarar "pronto", tinha apanhado em 5 segundos.

**Como fazer diferente**:
1. Correr servidor local **desde o minuto zero** da sessão.
2. Testar cada mudança localmente **antes** de committar.
3. Usar `Cmd+Option+J` com "Disable cache" activo durante desenvolvimento.
4. Deploy apenas em pontos de checkpoint (mudanças significativas, fim de sessão).

---

### 2.3 Mobile testing como reação, não prevenção

Dois bugs reportados apenas depois do utilizador testar fisicamente no telemóvel:

1. **Scroll desnecessário no welcome em iOS Safari** — causado por `100vh` quando devia ser `100dvh`. Esta é uma armadilha conhecida há 2+ anos na web mobile. **Devia ter sido o valor default desde o início**, não algo descoberto em debug.

2. **Favicon não renderizado no Arc Browser** — caso mais subtil (falta de PNG fallback e `apple-touch-icon`), mas ainda assim detectável em qualquer cross-browser smoke test antes de deploy.

**O padrão**: todo o desenvolvimento visual foi feito em Safari desktop. Mobile entrou no processo **depois** de o desktop parecer pronto. Isto inverte a ordem certa para uma app cujo público provável é maioritariamente mobile (reading apps são usadas no telemóvel mais do que no desktop).

**Como fazer diferente**: testar em mobile **antes** de desktop, ou pelo menos em paralelo. Abrir o servidor local, aceder via IP da rede local (`http://192.168.x.x:8000`) do telemóvel, e verificar cada mudança em ambos os dispositivos. O custo é trivial (uma janela extra); o benefício é catastrofal.

---

### 2.4 Dívida técnica introduzida e detectada em sessões distintas

Várias auditorias apanharam código morto que **eu próprio tinha introduzido** em passos anteriores da mesma sessão. Os exemplos mais claros:

- Variáveis CSS `--accent`, `--btn-bg`, `--btn-text`, `--welcome-bg`, `--dot-active-ring` tornaram-se mortas quando trocámos o botão sólido por link inline. Só foram detectadas numa auditoria **duas rondas depois**.
- Referência a `.open-btn` na media query `prefers-reduced-motion` ficou órfã durante dois commits consecutivos.
- `cursor: pointer` no `.welcome` em modo touch ficou como no-op silencioso.
- Espaços em branco extras e comentários obsoletos em vários pontos.

**O que isto revela**: quando removemos uma feature, **não fazemos limpeza profunda nas suas dependências**. Só atualizamos o que "quebraria" se não mexêssemos. Tudo o resto fica.

**Porque é mau**: porque cria a ilusão de que o código está limpo (os commits de remoção parecem pequenos e simples) quando na realidade está a acumular gordura. E porque, em projetos maiores, este é exatamente o padrão que leva a codebases de onde ninguém consegue remover nada porque tudo parece "possivelmente usado em algum lado".

**Como fazer diferente**: ao remover uma feature, fazer um search explícito por **todas** as referências — classes CSS, variáveis CSS, listeners JS, entradas em service worker, manifest, media queries, comentários. Escrever os grep commands como parte do próprio raciocínio do commit. "Removi X; verifiquei Y, Z, W; limpo."

---

### 2.5 Erros meus específicos e embaraçosos

Vou ser concreto em vez de vago. Os meus piores momentos técnicos na sessão:

**(a) O `brew install gh` em background que ficou preso.**
Iniciei-o em background, continuei a trabalhar noutras coisas, e só muito mais tarde percebi que o processo estava preso na fase de carregamento do shell snapshot. Matei-o, mas gastei tempo assumindo que estava a progredir. **Lição**: processos em background precisam de check-ins explícitos, não de otimismo.

**(b) A saga da rasterização PNG.**
Tentei primeiro `brew install librsvg` (falhou por permissões `/usr/local/include`), depois `pip3 install cairosvg` (falhou por Xcode CLT partido), antes de chegar a `qlmanage + sips` — que estavam instalados no sistema desde o início. **Lição**: começar sempre pela ferramenta já instalada. Só escalar se não chegar. Desperdicei ~3 tentativas em ferramentas que precisavam de setup.

**(c) O heredoc do `git commit` com apóstrofo.**
Escrevi uma mensagem de commit com "can't" dentro e o bash engoliu o heredoc. Erro básico. Corrigi reescrevendo sem o apóstrofo, mas é o tipo de falha que não devia ter acontecido, especialmente porque já estava a usar heredocs noutros commits sem problemas. **Lição**: atenção redobrada quando a shell envolve múltiplos níveis de quoting.

**(d) O tamanho inicial dos pontos do título.**
Implementei os três pontos sobre o M na homepage com os mesmos valores do preview HTML standalone, sem notar que o `line-height` era diferente (preview: 1.25, homepage: 1.75 herdado do body). O resultado foi pontos demasiado afastados do M. **Lição**: testar no contexto real, não em isolamento. O preview é para provar o conceito; a implementação é para testar no sítio final.

**(e) A sugestão do snarkdown.**
Durante a ronda de otimizações, sugeri trocar `marked` por `snarkdown` para poupar ~50KB. Marquei como "trade-off" mas incluí na lista de "otimizações". Quando o utilizador disse "aplica TUDO", corretamente notou que havia lá um item problemático e disse "salta". **Foi perto de ser uma regressão funcional** (perder tabelas e task lists em markdown). **Lição**: nunca misturar na mesma lista items com trade-off funcional e items sem trade-off. Separar visualmente e estruturalmente. Não confiar que o utilizador vai ler as notas finas quando disser "sim a tudo".

**(f) Respostas demasiado longas.**
Em muitos momentos dei três opções ranked + análise filosófica quando uma resposta direta servia. O utilizador estava a fazer perguntas específicas e recebeu dissertations. **Lição**: quando há uma decisão óbvia, recomendar directamente. Quando há uma decisão genuinamente ambígua, então sim, apresentar opções. Cortar o meio termo.

---

### 2.6 Erros do utilizador (porque foi pedido — "de ambos os lados")

Com o mesmo espírito de honestidade, as coisas que **tu** podias ter feito diferente:

**(a) Mudar de ideia mid-project é normal, mas tens um padrão de não confirmar o "está feito".**
Várias funcionalidades foram feitas, aprovadas, e depois voltaram para iterar. O caso mais claro foi o título/favicon (Opção 1 → 1b → ajustes de tamanho → ajustes de line-height). Cada iteração foi pequena, mas o conjunto significa que a mesma decisão foi reaberta 4-5 vezes. Isto custa tempo e fragmenta o mental model.

Não é mau iterar. O problema é iterar **sem um teste de aceitação claro antes de considerar feito**. Tens de ter um momento em que dizes "sim, isto cumpre o critério" e seguir para outra coisa. Senão, tudo é sempre "quase pronto".

**(b) Compraste um domínio no GoDaddy antes de validares a viabilidade do `.md`.**
A ordem deveria ter sido: pesquisar `.md` → verificar preço → descobrir que custa €200+ → decidir alternativa → comprar. Em vez disso, compraste primeiro noutro TLD no GoDaddy, depois explorámos `.md`, e só aí descobriste que estava fora do orçamento. Inverteu a ordem natural de decisão.

Não é fatal — apenas dinheiro ligeiramente gasto em algo que podia ter sido evitado.

**(c) Xcode Command Line Tools partido há tempo indefinido.**
O erro `missing xcrun at /Library/Developer/CommandLineTools/usr/bin/xcrun` quando tentei o `pip install` sugere que o CLT está partido. Isto **bloqueia silenciosamente** uma grande parte do ecossistema de ferramentas de dev em macOS. Se não arranjas agora, vai voltar a morder em todos os projetos futuros que envolvam Python, Node, Ruby, ou qualquer coisa com build native.

Fix: `xcode-select --install` e, se não correr, reinstalar via Software Update ou Developer.apple.com.

**(d) GitHub remote private inicialmente, com atraso de GitHub Pages.**
Criaste o repo como privado. GitHub Pages em contas gratuitas só funciona em repos públicos. Passámos um bocado a descobrir o 404 antes de perceberes que tinhas de mudar visibilidade. Não é um erro grave, mas é um exemplo de setup default ser o inimigo da velocidade.

**(e) Nunca abriste um terminal real para testar o push.**
Quando as credenciais git não estavam no keychain, a solução era fazer **um** push em Terminal.app (ou iTerm) para inicializar as credenciais. Em vez disso, passámos meia hora a tentar via o prompt do Claude Code, com várias voltas (`gh` install, etc.). Eventualmente funcionou, mas a rota mais rápida era "abre o Terminal, cola, dá enter uma vez na vida, volta aqui".

Isto é um padrão maior: em alguns momentos tentas resolver tudo dentro do mesmo contexto (Claude Code CLI) quando a ferramenta certa estava ao lado.

**(f) Zero checkpoints locais.**
Cada commit foi directamente para produção. Em nenhum momento houve um "está quase, vou gravar isto localmente e testar antes de fazer push". Isto é arriscado em projetos maiores (já não dá para reverter sem histórico visível) mas também em pessoais — perdes a capacidade de ter um "draft" que só tu vês.

---

### 2.7 Near-miss: o "aplica tudo" ao snarkdown

Já mencionei em 2.5(e), mas merece uma secção própria porque é o risco maior que corremos na sessão.

**Sequência dos eventos**:
1. Eu apresento lista de 8 otimizações, marcando o item 6 (snarkdown) com uma nota prosa a dizer "trade-off, perdes tabelas e task lists, só aplica se tiveres a certeza".
2. Utilizador responde "Aplica TUDO".
3. Eu começo a aplicar, mas antes de chegar ao snarkdown pergunto explicitamente: "Confirmas que queres perder tabelas?".
4. Utilizador apanha o alerta e responde "salta".

**Porque é que isto funcionou**: porque eu fiz um check adicional antes de aplicar o item polémico.

**Porque é que isto falhou**: porque se eu não tivesse feito esse check adicional, teríamos aplicado um downgrade funcional silenciosamente. A lista tinha um item problemático misturado com outros sem problema, e o "tudo" teria apanhado-o.

**Lição permanente**: nunca misturar **zero-risk refactors** com **trade-off decisions** na mesma lista. Separar explicitamente em duas secções, duas perguntas, dois "aplica?".

---

### 2.8 A PWA nunca foi testada realmente

Implementámos o manifest, o service worker, o apple-touch-icon, os ícones variantes — mas **não verificámos empiricamente**:
- A instalação em Android Chrome (prompt "Install app")
- A instalação em Safari iOS ("Add to Home Screen")
- O standalone mode após instalar
- O splash screen no launch
- O offline mode real (Airplane Mode + abrir a app)
- O ícone no home screen a parecer como desenhado

Tudo isto foi implementado confiando na spec e em memória. Se alguma destas partes não funciona, a v1 tem "PWA" como feature *listada* que pode não cumprir completamente na prática.

**Probabilidade de haver pelo menos um problema**: alta. PWAs são notórias por edge cases em iOS Safari.

**Como fazer diferente**: antes de considerar uma feature completa, ter uma checklist de testes de aceitação **executados**, não apenas "a implementação deve cobrir isto".

---

### 2.9 SRI hashes como dívida futura

Usámos `integrity="sha384-..."` em `marked@12.0.2` e `DOMPurify@3.1.6`. Bom do ponto de vista de segurança — protege contra modificação no CDN.

Mas cria um problema: **updates manuais obrigatórios**. Quando eventualmente quisermos atualizar `marked` de 12 para 13 (para patches de segurança, ou features novas), temos de:
1. Descarregar o novo ficheiro
2. Calcular o novo SHA-384
3. Atualizar a URL
4. Atualizar o `integrity`
5. Bump ao CACHE no SW
6. Deploy

Nada disto está automatizado. Quem mantém esquece.

Adicionalmente, SRI protege contra modificação mas não contra **indisponibilidade**. Se jsdelivr cair, o site parte para novos visitantes (o SW cache salva apenas visitantes existentes).

**Como fazer diferente**: considerar hospedar `marked` e `DOMPurify` localmente no repo. Custo: ~60KB adicionais no repo. Benefício: elimina dependência externa, SRI manual, risco de indisponibilidade de CDN. Para um projeto deste tamanho, self-hosted é arguably mais robusto do que CDN.

---

### 2.10 Dívida técnica que fica para v2

Mesmo depois de todas as auditorias, a v1 deixa:

1. **Zero gestão de erros** em `FileReader`, `marked.parse`, `DOMPurify.sanitize`. Qualquer exceção parte a app silenciosamente.
2. **Zero loading state** para ficheiros grandes. `marked.parse` é síncrono e bloqueia a UI.
3. **Magic numbers** espalhados em CSS e JS: `3000ms`, `2000ms`, `4500ms`, `0.18s`, `45ms`, `2px`, etc. Sem centralização.
4. **Progress bar 2px hardcoded** em `.controls { bottom: 2px }` e `.progress-track { height: 2px }` — acoplamento frágil.
5. **Service worker cache-first em HTML** — discutido mas nunca mudado para network-first. Stale updates continuam a ser um risco.
6. **localStorage orphan** — `marquis-font-size` fica em browsers de utilizadores que usaram versões anteriores com os botões A-/A+. Inofensivo mas é lixo.
7. **Sem testes, sem CI, sem linting** — o primeiro bug em prod vai doer.
8. **I18n zero** — strings hardcoded em PT. Refactor não-trivial se um dia for internacionalizado.
9. **Sem cache-busting** no `manifest.json` — mudanças ao manifest não são re-fetched automaticamente.
10. **Sem changelog** — 20+ commits sem documento de "o que mudou em v1". Daqui a 3 meses ninguém sabe o que foi v1.

---

## 3. O que correu bem (para contexto justo)

Para não ser injusto, as coisas que funcionaram:

- **Iteração de design de copy** (Abbott → "Devolve o monospace às máquinas" → "A devolver?") — o processo criativo foi sólido, as decisões foram bem fundamentadas.
- **Decisões de acessibilidade** depois da auditoria — os 7 fixes aplicados foram certeiros e sem complicações.
- **A direção minimalista estética** — o contraste entre "leitor quieto" vs "editor barulhento" ficou coerente em todos os aspectos (favicon, tagline, welcome, tipografia, ícone sépia como identidade do instalado).
- **O processo de favicon** — desde a exploração de opções, ao preview comparativo, à escolha, aos ajustes, até à variante sépia para apple-touch-icon. Foi iterativo mas produtivo.
- **GitHub Pages setup** — depois de passar pela fase embaraçosa do repo privado, o deploy ficou automático e fiável.
- **Service worker como padrão** — a implementação é defensiva (individual `cache.put` em vez de `addAll` atómico), o que é a escolha correta.
- **Literata** como escolha tipográfica — perfeitamente adequada ao propósito.

Tudo isto representa horas de discussão que resultaram em decisões boas. O problema deste documento não é que a v1 seja má — é que as horas gastas podiam ter sido metade se o processo fosse mais disciplinado.

---

## 4. Lições para levar daqui

### Para mim (assistente)

1. **Testar no contexto real, não em previews isolados.** O line-height do título falhou exatamente por isto.
2. **Começar pela solução mais simples já instalada no sistema.** A saga do PNG rasterizer foi completamente evitável.
3. **Separar estruturalmente recomendações "sem risco" de "com trade-off".** O near-miss do snarkdown não se pode repetir.
4. **Cortar preâmbulo quando o utilizador já decidiu.** Não apresentar 4 opções quando 1 é óbvia.
5. **Limpar dependências mortas no mesmo commit da remoção.** Não deixar para auditorias futuras.
6. **Background processes precisam de check-ins explícitos**, não de otimismo.
7. **Evitar rabbit holes em erros triviais** — o heredoc do commit devia ter sido resolvido em 10 segundos.
8. **Nunca misturar features e optimizations na mesma lista** — são categorias de decisão diferentes e merecem triagens diferentes.
9. **Respostas mais curtas por default.** Prosa é fricção. O utilizador lê tudo e filtra — cada palavra desnecessária aumenta a carga cognitiva.
10. **Verificar empiricamente features importantes, não confiar na spec.** A PWA talvez não funcione bem e nós não sabemos.

### Para ti (utilizador)

1. **Define o scope de v1 antes de escrever código.** Mesmo que seja 10 minutos num pedaço de papel. Vai poupar horas.
2. **Usa servidor local desde o minuto zero.** Commits só para checkpoints, não para ver mudanças visuais.
3. **Testa em mobile cedo**, pelo menos em paralelo com desktop. Não só quando alguém reporta.
4. **Arranja o Xcode CLT.** Já.
5. **Quando eu apresentar uma lista longa, pede-me para separar por risco antes de dizer "tudo".**
6. **Guarda decisões em texto fora do Claude.** Um `DECISIONS.md` ou `SPEC.md` no repo. A conversa em chat é volátil; o repo é permanente.
7. **Não mudes de ideia sem fechar a ideia anterior primeiro.** Iterar é bom, voltar atrás é bom, mas tem um momento de "aceito este estado" antes de voltar a abrir.
8. **Confirma viabilidade antes de gastar** (ver GoDaddy/`.md` saga).
9. **Usa o Terminal real quando precisas de um terminal real**, não tentes tudo através do Claude Code se houver fricção. Abrir Terminal.app custa 2 segundos.
10. **Considera um `CHANGELOG.md`** mesmo em projeto pessoal. 5 linhas por release dão-te memória institucional.

### Para nós os dois

1. **Feedback loop local → testar → committer → deployar** é a ordem certa. Invertemos muitas vezes.
2. **"Feito" é uma decisão, não uma descoberta.** Marquis v1 podia ter ficado "feito" em metade do tempo se tivéssemos parado para perguntar "chega?" em pontos mais cedos.
3. **Este post-mortem é mais valioso do que qualquer feature nova da v2.** Se a próxima sessão começar sem ler este documento, é um fracasso duplo: repetir os mesmos erros depois de os termos escrito.

---

## 5. Recomendações concretas para a próxima sessão

Se houver Marquis v2 ou outro projeto pessoal de esta natureza, seguir este checklist:

**Antes de começar:**
- [ ] `SPEC.md` de 1 página: problema, scope v1, excluído da v1
- [ ] `CHANGELOG.md` vazio, pronto para receber entradas
- [ ] `python3 -m http.server` a correr em background
- [ ] Browser aberto em `localhost:8000` com Disable Cache ativo
- [ ] Dispositivo mobile com acesso ao IP local testado

**Durante:**
- [ ] Cada feature tem um "definition of done" antes de começar
- [ ] Cada mudança é testada localmente antes de commit
- [ ] Mobile testado em paralelo, não no fim
- [ ] Ao remover feature, grep explícito por todas as referências
- [ ] Otimizações e features em listas separadas, nunca misturadas

**No fim:**
- [ ] Checklist de teste de aceitação executada (PWA install, offline, etc.)
- [ ] `CACHE` do SW bumped se algum asset mudou
- [ ] `CHANGELOG.md` atualizado
- [ ] Post-mortem escrito antes de declarar v2 fechada

---

## 6. Conclusão

A Marquis v1 existe. Funciona. Tem identidade. Vale a pena usar.

Mas **o processo que a produziu foi caótico**. Não catastrófico — não houve dados perdidos, não houve bugs graves em produção, não houve trabalho botado fora. Mas foi *ineficiente*: fizemos mais voltas do que precisávamos, corrigimos mais tarde o que podia ter sido feito certo à primeira, e terminámos por cansaço e não por definição.

A lição mais importante deste documento é simples: **planeia mais, deploys menos, testa em contexto real, e fecha decisões antes de as reabrires**. Se a próxima sessão seguir estas quatro regras, a v2 custa metade do tempo e produz o dobro do valor.

---

*Escrito a pedido expresso: "sê crítico em todos os aspectos, sem receios". Se doeu, era para doer. É para servir.*
