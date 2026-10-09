import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  AlertCircle,
  Briefcase,
  Check,
  CheckCircle2,
  Circle,
  Copy,
  ExternalLink,
  Eye,
  EyeOff,
  Pencil,
  Warehouse,
  X,
} from 'lucide-react';
import { useProjetoDetalheQuery } from '../../api/queries';
import { environment } from '../../config/environment';
import { useIsMobile } from '../../hooks/useIsMobile';
import { useNow } from '../../hooks/useNow';
import { useWorld } from '../../hooks/useWorld';
import { formatDateLong } from '../../lib/format';
import { useSedeStore } from '../../store/sedeStore';
import { toast } from '../../store/toastStore';
import { useUiStore } from '../../store/uiStore';
import type { ProjetoDTO } from '../../types/domain';
import { hojeISO } from '../../world/datas';
import {
  marcosEmOrdem,
  projetoEmFoco,
  projetosDoCliente,
  resumoDosMarcos,
  situacaoDoMarco,
  temAcessoDeProducao,
  urlSegura,
  type MarcoSituacao,
} from '../../world/sede';
import { clienteCode, clienteNome, isProjetoAtrasado, projetoCode, projetoProgress, statusTone } from '../../world/status';
import { cx } from '../tones';
import { Button, EmptyHint, Glass, IconButton, IconTile, KeyValue, ProgressBar, Section, StatusChip, ToneDot } from '../ui';

/**
 * Painel do escritório do cliente, na coluna da direita — o mesmo lugar e a mesma largura do
 * extrato da agência e da biblioteca. É a tela de projeto do portal (`projeto-detail`), na mesma
 * ordem: detalhes, observações, acesso de produção, links úteis, marcos e equipe.
 *
 * **Por ora é só leitura.** Cadastrar marco, link, acesso ou equipe continua no MrCodeAdmin (↗).
 *
 * Um cliente pode ter vários projetos e o escritório é do cliente: com mais de um, as abas no topo
 * trocam o projeto em foco.
 */
export function EscritorioPanel() {
  const isMobile = useIsMobile();

  return (
    <Glass
      className={cx(
        'flex flex-col overflow-hidden',
        // No celular é uma folha que sobe da base, na altura da lista do extrato (68dvh): acima dela
        // a sala continua à vista, e o painel rola.
        isMobile ? 'max-h-[68dvh] w-full rounded-b-none pb-[env(safe-area-inset-bottom)]' : 'max-h-full w-full'
      )}
    >
      <Escritorio />
    </Glass>
  );
}

function Escritorio() {
  const world = useWorld();
  const idCliente = useSedeStore((s) => s.idCliente);
  const pedido = useSedeStore((s) => s.idProjeto);
  const focarProjeto = useSedeStore((s) => s.focarProjeto);
  const exitInterior = useUiStore((s) => s.exitInterior);

  const cliente = world.clientes.find((c) => c.idCliente === idCliente);
  const projetos = useMemo(
    () => (idCliente === null ? [] : projetosDoCliente(world.projetos, idCliente)),
    [world.projetos, idCliente]
  );
  const emFoco = projetoEmFoco(projetos, pedido);
  const resumo = projetos.find((p) => p.idProjeto === emFoco);

  // Link velho (`?interior=sede:99`) de um cliente que não existe mais: com a lista confirmada, o
  // escritório esquece o dono — senão o `Esc` voltaria selecionando um cliente fantasma na cidade.
  const donoSumiu = idCliente !== null && !cliente && !world.isLoading && !world.isError;
  useEffect(() => {
    if (donoSumiu) useSedeStore.getState().limpar();
  }, [donoSumiu]);

  const fechar = (
    <IconButton label="Voltar para a cidade (Esc)" onClick={() => exitInterior()} className="-mr-1 -mt-1">
      <X className="h-4 w-4" />
    </IconButton>
  );

  // Recarregar com `?interior=sede:N` de um cliente que não existe mais (ou antes de a lista chegar).
  if (idCliente === null || !cliente) {
    return (
      <>
        <header className="flex items-start gap-3 border-b border-line px-4 pb-3 pt-4">
          <IconTile>
            <Briefcase className="h-5 w-5" />
          </IconTile>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-wider text-brand">Escritório do cliente</p>
            <h2 className="truncate text-[16px] font-bold leading-snug text-ink">
              {world.isLoading ? 'Carregando…' : 'Cliente indisponível'}
            </h2>
          </div>
          {fechar}
        </header>
        {!world.isLoading && (
          <div className="px-4 py-4">
            <EmptyHint>Este cliente não está na cidade — pode ter sido removido no MrCodeAdmin.</EmptyHint>
          </div>
        )}
      </>
    );
  }

  const nome = clienteNome(cliente);

  return (
    <>
      <header className="flex items-start gap-3 border-b border-line px-4 pb-3 pt-4">
        <IconTile>
          <Briefcase className="h-5 w-5" />
        </IconTile>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[10px] font-bold uppercase tracking-wider text-brand">
            Escritório · {clienteCode(cliente.idCliente)}
          </p>
          <h2 className="truncate text-[16px] font-bold leading-snug text-ink" title={nome}>
            {nome}
          </h2>
          <p className="truncate text-[12px] text-ink-2">
            {projetos.length} projeto{projetos.length === 1 ? '' : 's'}
            {cliente.status !== 'Ativo' && ' · cliente inativo'}
          </p>
        </div>
        <a
          href={`${environment.adminUrl}/clientes/${cliente.idCliente}`}
          target="_blank"
          rel="noreferrer"
          className="-mt-1 grid h-8 w-8 shrink-0 place-items-center rounded-lg text-ink-2 hover:bg-surface-2 hover:text-ink"
          title="Abrir o cliente no MrCodeAdmin"
          aria-label="Abrir o cliente no MrCodeAdmin"
        >
          <ExternalLink className="h-4 w-4" />
        </a>
        {fechar}
      </header>

      {projetos.length > 1 && (
        <div
          role="tablist"
          aria-label="Projetos do cliente"
          className="flex shrink-0 gap-1.5 overflow-x-auto border-b border-line px-4 py-2.5"
        >
          {projetos.map((p) => {
            const ativo = p.idProjeto === emFoco;
            return (
              <button
                key={p.idProjeto}
                role="tab"
                aria-selected={ativo}
                onClick={() => focarProjeto(p.idProjeto)}
                className={cx(
                  'flex max-w-56 shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12px] font-semibold transition-colors',
                  ativo ? 'bg-brand text-white' : 'bg-surface-2 text-ink-2 hover:text-ink'
                )}
                title={`${projetoCode(p.idProjeto)} · ${p.nome}`}
              >
                {!ativo && <ToneDot tone={statusTone(p.status)} />}
                <span className="truncate">{p.nome}</span>
              </button>
            );
          })}
        </div>
      )}

      {resumo ? (
        // `key`: trocar de projeto recomeça o painel — a senha revelada de um não vaza para o outro.
        <Projeto key={resumo.idProjeto} resumo={resumo} comAbas={projetos.length > 1} />
      ) : (
        <div className="px-4 py-4">
          <EmptyHint>Nenhum projeto ainda — abra um canteiro de obras pelo inspector do cliente.</EmptyHint>
        </div>
      )}
    </>
  );
}

/**
 * O projeto em foco. O cabeçalho e as datas saem da lista (já em cache, aparecem na hora); marcos,
 * equipe, links e a senha só existem no `GET /Projeto/{id}`.
 */
function Projeto({ resumo, comAbas }: { resumo: ProjetoDTO; comAbas: boolean }) {
  const { data: detalhe, isError, refetch } = useProjetoDetalheQuery(resumo.idProjeto);
  const enterYard = useUiStore((s) => s.enterYard);
  const now = useNow();
  const hoje = hojeISO(new Date(now));

  const p = detalhe ?? resumo;
  const atrasado = isProjetoAtrasado(p, now);
  const progresso = projetoProgress(p, now);
  const datas: [string, ReactNode][] = [
    ['Início', formatDateLong(p.dataInicio)],
    ['Previsão de término', formatDateLong(p.dataPrevisaoFim)],
  ];
  if (p.dataConclusao) datas.push(['Concluído em', formatDateLong(p.dataConclusao)]);

  const carregando = (o: string) =>
    isError ? (
      <div className="flex items-center gap-2 px-2 py-1 text-[12px] text-bad">
        Não foi possível carregar {o}.
        <button className="font-semibold underline" onClick={() => refetch()}>
          Tentar de novo
        </button>
      </div>
    ) : (
      <EmptyHint>Carregando {o}…</EmptyHint>
    );

  return (
    <>
      <div role={comAbas ? 'tabpanel' : undefined} className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">
        <div className="mt-3 rounded-xl bg-surface-2 px-3 py-2.5">
          <p className="text-[10px] font-bold uppercase tracking-wider text-ink-3">Projeto · {projetoCode(p.idProjeto)}</p>
          <h3 className="text-[15px] font-bold leading-snug text-ink">{p.nome}</h3>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <StatusChip status={p.prioridade} />
            <StatusChip status={p.status} />
            {atrasado && <StatusChip status="Atrasado" tone="bad" />}
          </div>
        </div>

        <Section title="Detalhes">
          <KeyValue rows={datas} />
          <div className="mb-1 mt-2 flex justify-between text-[12px]">
            <span className="text-ink-2">Cronograma</span>
            <span className="font-semibold text-ink tabular">{Math.round(progresso * 100)}%</span>
          </div>
          <ProgressBar value={progresso} tone={atrasado ? 'bad' : p.status === 'Concluido' ? 'ok' : 'info'} />
          {p.descricao?.trim() && <Texto>{p.descricao}</Texto>}
        </Section>

        {p.observacoes?.trim() && (
          <Section title="Observações">
            <Texto>{p.observacoes}</Texto>
          </Section>
        )}

        <Section title="Acesso de produção">
          {detalhe ? <AcessoDeProducao projeto={detalhe} /> : carregando('o acesso')}
        </Section>

        <Section title={detalhe ? `Links úteis (${detalhe.links.length})` : 'Links úteis'}>
          {!detalhe ? (
            carregando('os links')
          ) : detalhe.links.length === 0 ? (
            <EmptyHint>Nenhum link cadastrado ainda.</EmptyHint>
          ) : (
            <ul className="space-y-1">
              {detalhe.links.map((link) => (
                <li key={link.idProjetoLink}>
                  <Endereco url={link.url} rotulo={link.rotulo} />
                </li>
              ))}
            </ul>
          )}
        </Section>

        {detalhe ? (
          <Marcos marcos={detalhe.marcos} hoje={hoje} />
        ) : (
          <Section title="Marcos">{carregando('os marcos')}</Section>
        )}

        <Section title={detalhe ? `Equipe alocada (${detalhe.equipe.length})` : 'Equipe alocada'}>
          {!detalhe ? (
            carregando('a equipe')
          ) : detalhe.equipe.length === 0 ? (
            <EmptyHint>Nenhum colaborador alocado ainda.</EmptyHint>
          ) : (
            <ul className="divide-y divide-line/70">
              {detalhe.equipe.map((m) => (
                <li key={m.idUsuarioAdmin} className="flex items-center gap-2.5 py-1.5">
                  <span
                    aria-hidden
                    className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-info-soft text-[11px] font-bold text-info"
                  >
                    {m.nomeUsuarioAdmin.trim().charAt(0).toUpperCase()}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-ink">{m.nomeUsuarioAdmin}</span>
                  {m.papel && <span className="shrink-0 truncate text-[11px] text-ink-3">{m.papel}</span>}
                </li>
              ))}
            </ul>
          )}
        </Section>

      </div>

      <div className="flex flex-wrap gap-2 border-t border-line px-4 py-3">
        {/* Cancelado não tem pátio: a cidade não monta canteiro para ele. */}
        {p.status !== 'Cancelado' && (
          <Button variant="primary" onClick={() => enterYard(p.idProjeto)}>
            <Warehouse className="h-3.5 w-3.5" /> Pátio de obras
          </Button>
        )}
        {/* Cadastrar marco, link, acesso e equipe continua no portal — o escritório, por ora, é leitura. */}
        <a
          href={`${environment.adminUrl}/projetos/${p.idProjeto}`}
          target="_blank"
          rel="noreferrer"
          className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-line bg-white px-3 text-[12px] font-semibold text-ink transition-colors hover:bg-surface-2"
        >
          <Pencil className="h-3.5 w-3.5" /> Editar no MrCodeAdmin
        </a>
      </div>
    </>
  );
}

/** Texto livre do portal (descrição, observações): respeita as quebras de linha digitadas lá. */
function Texto({ children }: { children: string }) {
  return <p className="mt-2 whitespace-pre-line rounded-xl bg-surface-2 px-3 py-2.5 text-[13px] leading-relaxed text-ink">{children}</p>;
}

/**
 * Um endereço digitado no portal. Vira link só se for `http(s)` (`urlSegura`); o resto aparece como
 * texto, com o motivo no título — link sem destino seria promessa falsa de clique.
 */
function Endereco({ url, rotulo }: { url: string; rotulo?: string }) {
  const href = urlSegura(url);
  const conteudo = (
    <>
      <ExternalLink className={cx('h-3.5 w-3.5 shrink-0', href ? 'text-brand' : 'text-ink-3')} />
      {rotulo && <span className="shrink-0 text-[13px] font-semibold text-ink">{rotulo}</span>}
      <span className="min-w-0 truncate font-mono text-[11px] text-ink-2">{url}</span>
    </>
  );
  const classe = 'flex min-w-0 items-center gap-2 rounded-lg px-2 py-1.5';

  if (!href) {
    return (
      <span className={classe} title="Endereço sem http(s):// — não abre daqui">
        {conteudo}
      </span>
    );
  }
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={cx(classe, 'transition-colors hover:bg-surface-2')} title={url}>
      {conteudo}
    </a>
  );
}

function AcessoDeProducao({ projeto }: { projeto: ProjetoDTO }) {
  // Começa sempre escondida; a `key` do projeto zera isto ao trocar de aba ou sair do escritório.
  const [senhaVisivel, setSenhaVisivel] = useState(false);

  if (!temAcessoDeProducao(projeto)) return <EmptyHint>Nenhum acesso de produção cadastrado ainda.</EmptyHint>;

  return (
    <dl className="divide-y divide-line/70">
      {projeto.linkProducao && (
        <LinhaDeAcesso rotulo="Link">
          <Endereco url={projeto.linkProducao} />
        </LinhaDeAcesso>
      )}
      {projeto.loginProducao && (
        <LinhaDeAcesso rotulo="Login">
          <span className="min-w-0 truncate">{projeto.loginProducao}</span>
          <Copiar valor={projeto.loginProducao} rotulo="Copiar login" aviso="Login copiado" />
        </LinhaDeAcesso>
      )}
      {projeto.senhaProducao && (
        <LinhaDeAcesso rotulo="Senha">
          <span className="min-w-0 truncate font-mono text-[12px]">{senhaVisivel ? projeto.senhaProducao : '••••••••'}</span>
          <IconButton
            label={senhaVisivel ? 'Ocultar senha' : 'Mostrar senha'}
            aria-pressed={senhaVisivel}
            onClick={() => setSenhaVisivel(!senhaVisivel)}
            className="h-7 w-7 shrink-0"
          >
            {senhaVisivel ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
          </IconButton>
          <Copiar valor={projeto.senhaProducao} rotulo="Copiar senha" aviso="Senha copiada" />
        </LinhaDeAcesso>
      )}
    </dl>
  );
}

function LinhaDeAcesso({ rotulo, children }: { rotulo: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1 text-[13px]">
      <dt className="shrink-0 text-ink-2">{rotulo}</dt>
      <dd className="flex min-w-0 items-center justify-end gap-1 font-medium text-ink">{children}</dd>
    </div>
  );
}

/**
 * Copia para a área de transferência e confirma por toast. O toast **nunca** leva o valor: a senha
 * não pode aparecer na tela sem o usuário pedir.
 */
function Copiar({ valor, rotulo, aviso }: { valor: string; rotulo: string; aviso: string }) {
  const [copiado, setCopiado] = useState(false);

  async function copiar() {
    try {
      await navigator.clipboard.writeText(valor);
    } catch {
      // Sem permissão, fora de contexto seguro, ou a API nem existe no navegador.
      toast.bad('Não foi possível copiar', 'Selecione o texto e copie pelo teclado.');
      return;
    }
    setCopiado(true);
    setTimeout(() => setCopiado(false), 1500);
    toast.ok(aviso);
  }

  return (
    <IconButton label={copiado ? 'Copiado' : rotulo} onClick={copiar} className="h-7 w-7 shrink-0">
      {copiado ? <Check className="h-3.5 w-3.5 text-ok" /> : <Copy className="h-3.5 w-3.5" />}
    </IconButton>
  );
}

const MARCO_ICONE: Record<MarcoSituacao, ReactNode> = {
  concluido: <CheckCircle2 className="h-4 w-4 text-ok" />,
  atrasado: <AlertCircle className="h-4 w-4 text-bad" />,
  previsto: <Circle className="h-4 w-4 text-ink-3" />,
};

function legendaDoMarco(m: ProjetoDTO['marcos'][number], situacao: MarcoSituacao): string {
  if (situacao === 'concluido') return m.dataConclusao ? `Concluído em ${formatDateLong(m.dataConclusao)}` : 'Concluído';
  const previsto = formatDateLong(m.dataPrevista);
  return situacao === 'atrasado' ? `Atrasado · previsto para ${previsto}` : `Previsto para ${previsto}`;
}

function Marcos({ marcos, hoje }: { marcos: ProjetoDTO['marcos']; hoje: string }) {
  const { total, concluidos, atrasados } = resumoDosMarcos(marcos, hoje);

  return (
    <Section
      title={`Marcos (${concluidos}/${total})`}
      action={atrasados > 0 ? <StatusChip status={`${atrasados} atrasado${atrasados === 1 ? '' : 's'}`} tone="bad" /> : undefined}
    >
      {total === 0 ? (
        <EmptyHint>Nenhum marco cadastrado ainda.</EmptyHint>
      ) : (
        <>
          <ProgressBar value={concluidos / total} tone="ok" className="mb-1.5" />
          <ul className="space-y-0.5">
            {marcosEmOrdem(marcos).map((m) => {
              const situacao = situacaoDoMarco(m, hoje);
              return (
                <li key={m.idMarco} className="flex items-start gap-2.5 rounded-lg px-2 py-1.5">
                  <span className="mt-0.5 shrink-0">{MARCO_ICONE[situacao]}</span>
                  <span className="min-w-0 flex-1">
                    <span
                      className={cx(
                        'block text-[13px] font-medium',
                        situacao === 'concluido' ? 'text-ink-3 line-through' : 'text-ink'
                      )}
                    >
                      {m.titulo}
                    </span>
                    <span className={cx('block text-[11px]', situacao === 'atrasado' ? 'text-bad' : 'text-ink-3')}>
                      {legendaDoMarco(m, situacao)}
                    </span>
                  </span>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </Section>
  );
}
