# Harvestão — Fazenda 3D

Versão 0.2.0. Jogo de fazenda para navegador, em desenvolvimento, inspirado na experiência de Harvest Moon: Back to Nature. Ainda não é uma reprodução completa do jogo original.

## Jogar
Abra o endereço hospedado. No celular, mantenha o dedo no direcional circular e arraste em qualquer direção. A usa a ferramenta selecionada. B pega uma colheita ou interage com a casa, caixa de vendas e poço. No computador: WASD/setas, espaço, E, Q para trocar ferramenta e Shift para correr.

## Implementado
- Cenário e personagem 3D próprios, câmera ortográfica acompanhando o jogador, sombras, vegetação, casa e poço.
- Boné e macacão verde musgo, camisa ocre, botas marrons e lenço roxo.
- Direcional analógico por Pointer Events, com captura do dedo e cancelamento ao perder foco.
- Ações no quadrado à frente, colisões com construções, pedras e plantações crescidas.
- Enxada, regador, foice, machado, martelo, sementes em área 3 x 3.
- Água limitada, reabastecimento, energia, calendário, crescimento por dias regados e rebrota.
- Colheita carregada nas mãos, caixa de vendas e pagamento às 17h.
- Salvamento automático local, exportação e importação de progresso.
- Fazenda inicial com canteiros demonstrativos e opção de começar uma fazenda vazia.

## Limites atuais
A arte 3D é uma primeira implementação da direção visual aprovada, não uma reprodução pixel a pixel do concept. Modelos são construídos por código. Sem vila explorável, moradores, relações, festivais, animais funcionais, interiores, mineração, pesca, upgrades ou roteiro completo. Sementes são compradas pela mochila enquanto a loja não é implementada. Clima e fadiga são simplificados. O calendário e os valores de cultivo ainda precisam de auditoria sistemática contra o original para uma reprodução exata.

## Executar e testar
Arquivos estáticos, sem dependência de rede em tempo de execução. Sirva esta pasta com um servidor HTTP. Não abra index.html por file://, pois navegadores bloqueiam módulos ES locais.

Requer WebGL 2. Three.js r170 está incluído; licença MIT em THREE-LICENSE.txt.

Teste da simulação: `node --test simulation.test.js` (Node 22+ ou package.json com type: module).

## Salvamento
A versão 0.2 usa o slot local `harvestao-v2`; preserva o slot antigo `harvestao-v1`. Progresso não é sincronizado entre celulares ou domínios. Exporte antes de mudar de endereço.

Não inclui ISO, ROM, músicas, diálogos ou arquivos extraídos de Harvest Moon.
