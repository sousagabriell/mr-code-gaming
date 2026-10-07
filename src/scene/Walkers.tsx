import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type { Group } from 'three';
import { useAllKanbans } from '../api/queries';
import { useWorld } from '../hooks/useWorld';
import { useUiStore } from '../store/uiStore';
import { COLORS } from '../world/colors';
import { LANDMARK_Z, type CityLayout, type Vec3 } from '../world/layout';
import { pathLength, pointAt, walkerRoute, type Path } from '../world/routes';
import { useRegisterMover } from './movers';
import { SceneTag } from './SceneTag';
import { useHover } from './useHover';

const SHIRTS = [COLORS.brandBlue, COLORS.brandPurple, '#0ea5e9', '#14b8a6', '#f97316', '#e11d48'];
const SPEED = 0.9;

function seeded(n: number): number {
  const x = Math.sin(n * 91.7) * 43758.5453;
  return x - Math.floor(x);
}

interface WalkerPlan {
  id: number;
  nome: string;
  routes: { path: Path; length: number; projeto: string }[];
}

type Phase = 'rest' | 'go' | 'work' | 'back';

/**
 * Colaborador indo da praça até os canteiros dos projetos em que tem atividade aberta, trabalhando
 * um pouco e voltando — em rodízio entre os projetos.
 */
function Walker({ plan }: { plan: WalkerPlan }) {
  const ref = useRef<Group>(null);
  const bodyRef = useRef<Group>(null);
  const phase = useRef<Phase>('rest');
  const dist = useRef(0);
  const timer = useRef(seeded(plan.id) * 6);
  const routeIdx = useRef(0);
  const select = useUiStore((s) => s.select);
  const isSelected = useUiStore((s) => s.selected?.kind === 'colaborador' && s.selected.id === plan.id);
  const { hovered, bind } = useHover();
  useRegisterMover(`colaborador:${plan.id}`, ref);

  useFrame(({ clock }, delta) => {
    const g = ref.current;
    if (!g || plan.routes.length === 0) return;
    const route = plan.routes[routeIdx.current % plan.routes.length];

    switch (phase.current) {
      case 'rest':
        timer.current -= delta;
        if (timer.current <= 0) phase.current = 'go';
        break;
      case 'go':
        dist.current += SPEED * delta;
        if (dist.current >= route.length) {
          dist.current = route.length;
          phase.current = 'work';
          timer.current = 4 + seeded(plan.id + clock.elapsedTime) * 4;
        }
        break;
      case 'work':
        timer.current -= delta;
        if (timer.current <= 0) phase.current = 'back';
        break;
      case 'back':
        dist.current -= SPEED * delta;
        if (dist.current <= 0) {
          dist.current = 0;
          phase.current = 'rest';
          timer.current = 2 + seeded(plan.id * 3) * 3;
          routeIdx.current += 1;
        }
        break;
    }

    const { position, heading } = pointAt(route.path, dist.current);
    g.position.set(position[0], 0, position[2]);
    const moving = phase.current === 'go' || phase.current === 'back';
    if (moving) g.rotation.y = phase.current === 'go' ? heading : heading + Math.PI;
    if (bodyRef.current) bodyRef.current.position.y = moving ? Math.abs(Math.sin(clock.elapsedTime * 9)) * 0.03 : 0;
  });

  const shirt = SHIRTS[plan.id % SHIRTS.length];
  const projetos = plan.routes.map((r) => r.projeto).join(' · ');

  return (
    <group
      ref={ref}
      onClick={(e) => {
        e.stopPropagation();
        select({ kind: 'colaborador', id: plan.id });
      }}
      {...bind}
    >
      <group ref={bodyRef}>
        <mesh position={[0, 0.13, 0]} castShadow>
          <capsuleGeometry args={[0.06, 0.12, 4, 8]} />
          <meshStandardMaterial color={shirt} emissive="#ffffff" emissiveIntensity={hovered || isSelected ? 0.25 : 0} />
        </mesh>
        <mesh position={[0, 0.29, 0]} castShadow>
          <sphereGeometry args={[0.05, 12, 10]} />
          <meshStandardMaterial color="#f1c7a5" />
        </mesh>
        {/* Capacete de obra */}
        <mesh position={[0, 0.315, 0]}>
          <sphereGeometry args={[0.056, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshStandardMaterial color={COLORS.warning} />
        </mesh>
      </group>
      {/* Área de clique maior que o bonequinho */}
      <mesh position={[0, 0.2, 0]} visible={false}>
        <boxGeometry args={[0.35, 0.45, 0.35]} />
      </mesh>
      <SceneTag
        visible={hovered || isSelected}
        position={[0, 0.65, 0]}
        code={plan.nome.split(' ')[0]}
        text={projetos || undefined}
        accent={shirt}
      />
    </group>
  );
}

/** Quem tem atividade aberta em projetos com canteiro na cidade vira um pedestre com rota. */
export function Walkers({ layout }: { layout: CityLayout }) {
  const { projetos } = useWorld();
  const kanbans = useAllKanbans(projetos);

  const plans = useMemo<WalkerPlan[]>(() => {
    const siteById = new Map(layout.constructionSites.map((s) => [s.projeto.idProjeto, s]));
    const byPessoa = new Map<number, { nome: string; sites: { pos: Vec3; projeto: string }[] }>();

    for (const [idProjeto, colunas] of kanbans) {
      const site = siteById.get(idProjeto);
      if (!site || site.projeto.status === 'Concluido') continue;
      for (const coluna of colunas) {
        if (coluna.ehColunaConclusao) continue;
        for (const a of coluna.atividades) {
          if (!a.idUsuarioAdminResponsavel) continue;
          const entry = byPessoa.get(a.idUsuarioAdminResponsavel) ?? { nome: a.nomeResponsavel ?? 'Equipe', sites: [] };
          if (!entry.sites.some((s) => s.projeto === site.projeto.nome)) entry.sites.push({ pos: site.position, projeto: site.projeto.nome });
          byPessoa.set(a.idUsuarioAdminResponsavel, entry);
        }
      }
    }

    return [...byPessoa.entries()].slice(0, 12).map(([id, v]) => {
      // Cada pessoa sai de um ponto diferente da praça, perto da Prefeitura.
      const plaza: Vec3 = [3 + seeded(id) * 6, 0, LANDMARK_Z + 1.7 + seeded(id + 7) * 0.6];
      return {
        id,
        nome: v.nome,
        routes: v.sites.map((s) => {
          const path = walkerRoute(plaza, s.pos);
          return { path, length: pathLength(path), projeto: s.projeto };
        }),
      };
    });
  }, [kanbans, layout.constructionSites]);

  return (
    <>
      {plans.map((p) => (
        <Walker key={p.id} plan={p} />
      ))}
    </>
  );
}
