import type { ProjetoDTO, WikiPaginaDTO } from '../types/domain';

/**
 * Acervo de exemplo para a biblioteca da Universidade (§9.11 / §10.4).
 *
 * A wiki de um ambiente de desenvolvimento costuma estar vazia, e aí a estante não mostra o que foi
 * feito: não dá para ver a divisão por prateleira, a variação de grossura das lombadas nem o artigo
 * renderizado. Este módulo enche a estante **sem tocar no backend**.
 *
 * **Só existe em dev** (`import.meta.env.DEV`), e em duas situações:
 *
 * - **a wiki voltou vazia** — não há dado real para esconder, então entra sozinho;
 * - **`?mock=wiki` na URL** — força mesmo quando existe wiki de verdade, para conferir a estante
 *   cheia sem mexer no banco.
 *
 * Em qualquer um dos dois a HUD mostra o chip **"exemplo"** (ver `WikiPanel` e `LibraryBar`): dado
 * falso que não se anuncia é pior que estante vazia, porque quem olha a tela não tem como saber.
 */
const forcadoNaUrl = () =>
  typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('mock') === 'wiki';

/**
 * @param carregou a query da wiki já respondeu (sem isso o acervo piscaria durante o carregamento)
 * @param quantos artigos que vieram do backend
 */
export const usarAcervoDeExemplo = (carregou: boolean, quantos: number) =>
  import.meta.env.DEV && (forcadoNaUrl() || (carregou && quantos === 0));

const COMO_PUBLICAR = `
<h2>Antes de publicar</h2>
<p>A publicação é manual e leva cerca de dez minutos. Rode a bateria toda antes de abrir o PR:</p>
<pre>npm run lint
npx tsc -b
npm test
npm run build</pre>
<h3>Checklist</h3>
<ul>
  <li>Migrations aplicadas em homologação e conferidas com o time de dados</li>
  <li><strong>CHANGELOG</strong> atualizado com a versão e a data</li>
  <li>Variáveis novas registradas no cofre e no <code>appsettings</code> do ambiente</li>
</ul>
<blockquote>Publicação em sexta-feira só com justificativa e alguém de plantão.</blockquote>
<p>Dúvidas sobre o pipeline ficam no canal <em>#infra</em>.</p>
`;

const PADROES = `
<h2>O que a revisão procura</h2>
<p>Revisão não é caça a erro de digitação — é a segunda cabeça lendo a decisão. A ordem de prioridade:</p>
<ol>
  <li>O código faz o que o chamado pediu?</li>
  <li>O caso de erro está tratado, ou só o caminho feliz?</li>
  <li>O nome diz o que a coisa é?</li>
  <li>Dá para apagar alguma coisa?</li>
</ol>
<h3>Comentários</h3>
<p>Comentário explica o <strong>porquê</strong>. O <em>o quê</em> já está no código logo abaixo; quando o
comentário precisa repetir a linha, normalmente o problema é o nome da variável.</p>
<table>
  <thead><tr><th>Situação</th><th>O que fazer</th></tr></thead>
  <tbody>
    <tr><td>Regra de negócio</td><td>Vai para a camada pura, com teste</td></tr>
    <tr><td>Contorno de bug de biblioteca</td><td>Comentar com o link da issue</td></tr>
    <tr><td>Decisão não óbvia</td><td>Registrar aqui na wiki e referenciar</td></tr>
  </tbody>
</table>
`;

const AMBIENTES = `
<h2>Os três ambientes</h2>
<p>Desenvolvimento roda local contra o backend em <code>localhost:5200</code>. Homologação e produção
sobem pelo mesmo pipeline, mudando só o arquivo de configuração.</p>
<ul>
  <li><strong>dev</strong> — banco local, observabilidade desligada, e-mails caem num log</li>
  <li><strong>hml</strong> — espelho da produção com dados anonimizados, restaurado toda segunda</li>
  <li><strong>prod</strong> — acesso por VPN; qualquer alteração manual vira incidente</li>
</ul>
<h3>Segredos</h3>
<p>Nenhuma chave entra no repositório. O cofre é a fonte, e o pipeline injeta na subida. Se você
precisou colar uma chave num arquivo para testar, apague antes do commit e
<a href="https://docs.mrcode.com.br/seguranca/rotacao">rotacione</a>.</p>
`;

const CHAMADOS = `
<h2>Da abertura ao fechamento</h2>
<p>Todo chamado nasce <strong>Aberto</strong>, ganha responsável e vira <strong>Em andamento</strong>. Só
fecha depois de o cliente confirmar — resolver e fechar são passos diferentes de propósito.</p>
<h3>Prioridade</h3>
<ul>
  <li><strong>Alta</strong> — o cliente está parado. Resposta no mesmo dia.</li>
  <li><strong>Média</strong> — incomoda, mas tem contorno.</li>
  <li><strong>Baixa</strong> — melhoria, dúvida, pedido de relatório.</li>
</ul>
<p>Virar tarefa exige <em>prazo</em>, e o prazo vira mensagem automática na conversa do cliente. É o
único compromisso de data que o sistema registra sozinho — trate como promessa.</p>
`;

const ARQUITETURA = `
<h2>Camadas</h2>
<p>A API segue a divisão de sempre: <code>Api</code> recebe, <code>Application</code> orquestra,
<code>Domain</code> decide e <code>Infra</code> persiste. Regra de negócio em controller é o erro mais
comum da base, e o mais caro de desfazer depois.</p>
<h3>Onde cada coisa mora</h3>
<ol>
  <li>Validação de formato: <code>Validators</code>, com FluentValidation</li>
  <li>Validação de regra: serviço de domínio</li>
  <li>Consulta: repositório, sempre com projeção — nada de trazer a entidade inteira para ler um campo</li>
</ol>
<p>Toda resposta sai no envelope <code>{ isSuccess, message, data, errors }</code>.</p>
`;

const INTEGRACAO = `
<h2>Contrato</h2>
<p>A integração é por webhook com reentrega. O parceiro repete o evento até receber <code>200</code>,
então o <strong>processamento precisa ser idempotente</strong>: a chave é o id do evento, guardado na
tabela de recebidos.</p>
<h3>Erros conhecidos</h3>
<ul>
  <li><code>409</code> na reentrega — esperado, significa que já processamos</li>
  <li><code>422</code> — payload fora do contrato; abrir chamado para o parceiro com o corpo recebido</li>
  <li>Timeout — não repetir na hora: a fila tenta de novo com recuo exponencial</li>
</ul>
`;

const HOMOLOGACAO = `
<h2>Como a homologação acontece</h2>
<p>A entrega vai para homologação com um roteiro escrito — nunca "está no ar, dá uma olhada". O roteiro
lista o que mudou, o que testar e o que <em>não</em> faz parte desta entrega.</p>
<ol>
  <li>Subir em hml e conferir o caminho feliz você mesmo</li>
  <li>Enviar o roteiro na conversa do cliente, com prazo de retorno</li>
  <li>Registrar o aceite no chamado antes de fechar</li>
</ol>
<blockquote>Sem aceite registrado, a entrega não existiu.</blockquote>
`;

const RELATORIOS = `
<h2>Exportação</h2>
<p>A exportação monta o arquivo em memória e devolve como anexo. Acima de dez mil linhas o processo passa
para a fila e o usuário recebe o link por e-mail.</p>
<h3>Formato</h3>
<p>CSV com separador <code>;</code> e BOM UTF-8 — sem o BOM, o Excel em português abre acentuação
quebrada, e é a primeira reclamação que chega.</p>
`;

const PERFORMANCE = `
<h2>Por onde começar</h2>
<p>Antes de otimizar, meça. Quase toda lentidão relatada aqui caiu numa destas três:</p>
<ol>
  <li>Consulta sem índice numa tela de listagem</li>
  <li>N+1 — o laço que carrega o relacionamento registro a registro</li>
  <li>Payload grande demais para a tela, trazendo campo que ninguém mostra</li>
</ol>
<p>O plano de execução resolve as duas primeiras em minutos. A terceira aparece na aba de rede do
navegador.</p>
`;

const GLOSSARIO = `
<h2>Termos que aparecem o tempo todo</h2>
<table>
  <thead><tr><th>Termo</th><th>O que é</th></tr></thead>
  <tbody>
    <tr><td><strong>Chamado</strong></td><td>Pedido do cliente. Vira tarefa quando entra no quadro de um projeto.</td></tr>
    <tr><td><strong>Canteiro</strong></td><td>Como o jogo chama um projeto em obras.</td></tr>
    <tr><td><strong>Zona</strong></td><td>Coluna do quadro Kanban.</td></tr>
    <tr><td><strong>Protocolo</strong></td><td>Número do chamado, no formato <code>MC-aaaammddhhmmss</code>.</td></tr>
    <tr><td><strong>Recorrente</strong></td><td>Fatura ou despesa gerada todo mês pelo botão do financeiro.</td></tr>
  </tbody>
</table>
`;

const ONBOARDING = `
<h2>Primeira semana</h2>
<ol>
  <li>Acessos: repositório, cofre de segredos, VPN e o painel de observabilidade</li>
  <li>Subir o ambiente local e rodar a bateria de testes até passar inteira</li>
  <li>Pegar um chamado de prioridade baixa e levar até o fim, com revisão</li>
</ol>
<p>Ninguém é cobrado por entrega na primeira semana. É para ler código e perguntar.</p>
<blockquote>Pergunta repetida vira artigo aqui. Se você precisou perguntar, provavelmente falta a página.</blockquote>
`;

const BACKUP = `
<h2>Rotina</h2>
<p>Dump completo toda madrugada, retenção de trinta dias, cópia fora do provedor principal. O
<em>restore</em> é testado no primeiro dia útil de cada mês — backup que nunca foi restaurado não é
backup, é esperança.</p>
<h3>Em caso de incidente</h3>
<ol>
  <li>Congelar escritas na aplicação</li>
  <li>Restaurar numa base nova, nunca por cima da que está no ar</li>
  <li>Conferir contagens das tabelas críticas antes de apontar a aplicação</li>
</ol>
`;

const DADOS_MIGRATIONS = `
<h2>Convenção</h2>
<p>Uma migration por mudança, com nome descritivo — <code>AddWikiEProjetoLinks</code> diz o que faz;
<code>Update3</code> não diz nada. Migration já aplicada em produção <strong>não</strong> se edita:
corrige-se com uma nova.</p>
<h3>Campos novos</h3>
<p>Sempre anuláveis ou com valor padrão. Coluna <code>NOT NULL</code> sem padrão trava a subida numa
tabela que já tem linhas, e a descoberta costuma ser no meio da publicação.</p>
`;

const AUTENTICACAO = `
<h2>Como o token circula</h2>
<p>O login devolve um JWT que o front guarda e manda em <code>Authorization: Bearer</code> a cada
chamada. Expirado, a API responde <code>401</code> e o cliente HTTP derruba a sessão — não há
renovação silenciosa hoje.</p>
<ul>
  <li>Perfil <strong>ADMIN</strong> vê a equipe; <strong>STAFF</strong> não</li>
  <li>O token carrega id e perfil; nada além disso</li>
  <li>Em teste automatizado, renove o token antes da suíte — expirado, tudo falha junto</li>
</ul>
`;

const RELEASE_NOTES = `
<h2>Para quem se escreve</h2>
<p>As notas são lidas pelo cliente, não pelo time. Nada de nome de branch, de classe ou de migration:
descreva o que mudou <em>na tela dele</em>.</p>
<h3>Estrutura</h3>
<ul>
  <li><strong>Novidades</strong> — o que passou a existir</li>
  <li><strong>Melhorias</strong> — o que já existia e ficou melhor</li>
  <li><strong>Correções</strong> — com o número do chamado, quando houver</li>
</ul>
`;

const COTAS = `
<h2>Limites por plano</h2>
<table>
  <thead><tr><th>Recurso</th><th>Básico</th><th>Avançado</th></tr></thead>
  <tbody>
    <tr><td>Chamados por mês</td><td>50</td><td>sem limite</td></tr>
    <tr><td>Usuários</td><td>5</td><td>25</td></tr>
    <tr><td>Retenção de anexos</td><td>90 dias</td><td>2 anos</td></tr>
  </tbody>
</table>
<p>Estourar a cota não bloqueia: gera aviso e entra na fatura do mês seguinte.</p>
`;

/**
 * Título e corpo andam **juntos**. Parear por índice (um laço sobre títulos pegando corpos com
 * módulo) foi o primeiro jeito e deu artigo com conteúdo de outro assunto — num acervo de exemplo
 * isso não é detalhe, é o que se vai olhar na tela.
 */
const GERAIS: [string, string][] = [
  ['Glossário', GLOSSARIO],
  ['Checklist de publicação em produção', COMO_PUBLICAR],
  ['Padrões de código e revisão de PR', PADROES],
  ['Ambientes, variáveis e segredos', AMBIENTES],
  ['Como abrir e classificar um chamado', CHAMADOS],
  ['Onboarding', ONBOARDING],
  ['Política de backup e restauração do banco', BACKUP],
];

const DE_PROJETO: [string, string][] = [
  ['Arquitetura do módulo', ARQUITETURA],
  ['Modelo de dados e migrations', DADOS_MIGRATIONS],
  ['Integração com a API do parceiro', INTEGRACAO],
  ['Rotina de homologação com o cliente', HOMOLOGACAO],
  ['Fluxo de autenticação', AUTENTICACAO],
  ['Relatórios e exportação em CSV', RELATORIOS],
  ['Investigando lentidão: por onde começar', PERFORMANCE],
  ['Guia de notas de versão', RELEASE_NOTES],
  ['Limites de uso e cotas', COTAS],
];

/** Um artigo antigo, de antes do editor rico — é o caminho de texto cru do `WikiConteudo`. */
const TEXTO_CRU = `Notas da reunião de abertura.

Participaram: produto, dados e o time de entrega.
O cliente quer a primeira versão rodando antes do fechamento do trimestre.

Pendências levantadas:
- acesso ao ambiente do parceiro ainda não liberado
- definição do layout do relatório mensal
- quem assina o aceite de cada entrega

Próxima conversa na segunda-feira.`;

const AUTORES = ['Lucas Andrade', 'Marina Prado', 'Rafael Nunes', 'Camila Barros'];

const diasAtras = (base: number, dias: number) => new Date(base - dias * 86_400_000).toISOString().slice(0, 19);

/**
 * Monta o acervo em cima dos **projetos que existem de verdade** no ambiente, para as etiquetas da
 * estante mostrarem nomes reais. Sem projeto nenhum, tudo cai na prateleira "Geral" — a estante
 * continua cheia.
 */
export function paginasDeExemplo(projetos: Pick<ProjetoDTO, 'idProjeto' | 'nome'>[]): WikiPaginaDTO[] {
  const agora = Date.now();
  const alvos = projetos.slice(0, 3);
  let id = 9000;
  const autor = (i: number) => AUTORES[i % AUTORES.length];

  const gerais = GERAIS.map<WikiPaginaDTO>(([titulo, conteudo], i) => ({
    idPagina: id++,
    idProjeto: null,
    projetoNome: null,
    titulo,
    conteudo,
    autorNome: autor(i),
    dataCriacao: diasAtras(agora, 120 - i * 7),
    dataAtualizacao: diasAtras(agora, 2 + i * 3),
  }));

  // Sem projeto no ambiente, estes também caem na "Geral" — a estante continua cheia.
  const porProjeto = DE_PROJETO.map<WikiPaginaDTO>(([titulo, conteudo], i) => {
    const projeto = alvos.length > 0 ? alvos[i % alvos.length] : null;
    return {
      idPagina: id++,
      idProjeto: projeto?.idProjeto ?? null,
      projetoNome: projeto?.nome ?? null,
      titulo,
      conteudo,
      autorNome: autor(i + 1),
      dataCriacao: diasAtras(agora, 90 - i * 5),
      dataAtualizacao: diasAtras(agora, 1 + i * 2),
    };
  });

  const antigo: WikiPaginaDTO = {
    idPagina: id++,
    idProjeto: alvos[0]?.idProjeto ?? null,
    projetoNome: alvos[0]?.nome ?? null,
    titulo: 'Notas da reunião de abertura',
    conteudo: TEXTO_CRU,
    autorNome: AUTORES[2],
    dataCriacao: diasAtras(agora, 210),
    dataAtualizacao: diasAtras(agora, 190),
  };

  return [...gerais, ...porProjeto, antigo];
}
