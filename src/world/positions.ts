import type { EntityRef } from '../store/uiStore';
import type { ChamadoDTO, FaturaDTO } from '../types/domain';
import type { CityLayout, Vec3 } from './layout';

/** Onde a câmera deve olhar para cada tipo de entidade selecionada. */
export function entityPosition(
  ref: EntityRef,
  layout: CityLayout,
  data: { chamados: ChamadoDTO[]; faturas: FaturaDTO[] }
): Vec3 | null {
  const landmark = (kind: string) => layout.landmarks.find((l) => l.kind === kind)?.position ?? null;
  const cliente = (idCliente: number | null | undefined) => {
    const plot = layout.clientPlots.find((p) => p.cliente.idCliente === idCliente);
    return plot ? ([plot.position[0], plot.height / 2, plot.position[2]] as Vec3) : null;
  };

  switch (ref.kind) {
    case 'cliente':
      return cliente(ref.id);
    case 'projeto': {
      const site = layout.constructionSites.find((s) => s.projeto.idProjeto === ref.id);
      return site ? [site.position[0], 0.4, site.position[2]] : null;
    }
    case 'chamado': {
      // Chamado aberto = caminhão na rua em frente à sede; fechado = a própria sede.
      const truck = layout.trucks.find((t) => t.chamado.idChamado === ref.id);
      if (truck) return [truck.position[0], 0.3, truck.position[2]];
      const chamado = data.chamados.find((c) => c.idChamado === ref.id);
      return cliente(chamado?.idCliente) ?? landmark('datacenter');
    }
    case 'fatura': {
      const fatura = data.faturas.find((f) => f.idFatura === ref.id);
      return cliente(fatura?.idCliente) ?? landmark('banco');
    }
    case 'colaborador':
      // A equipe mora no Escritório; a Prefeitura cuida das metas.
      return landmark('escritorio');
    default:
      return landmark(ref.kind);
  }
}
