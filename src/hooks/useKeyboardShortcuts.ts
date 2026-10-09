import { useEffect } from 'react';
import { goHome, panStep, rotateQuarter, zoomStep } from '../hud/camera';
import { useBankStore } from '../store/bankStore';
import { useGameStore } from '../store/gameStore';
import { usePhoneStore } from '../store/phoneStore';
import { usePrefsStore } from '../store/prefsStore';
import { useSedeStore } from '../store/sedeStore';
import { useUiStore } from '../store/uiStore';
import { useWikiStore } from '../store/wikiStore';
import type { InteriorKind } from '../world/interiors';

function isTyping(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
}

/** Cada interior tem seu painel, e cada painel sabe voltar um degrau antes de o Esc sair do cenário. */
const painelDoInterior = (kind: InteriorKind): { voltar: () => boolean } =>
  kind === 'banco' ? useBankStore.getState() : kind === 'universidade' ? useWikiStore.getState() : useSedeStore.getState();

const PAN = 2;

/**
 * Atalhos globais: / busca · Esc fecha/desseleciona · B construção · Q/E girar · H visão geral ·
 * +/− zoom · WASD/setas pan.
 */
export function useKeyboardShortcuts() {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const ui = useUiStore.getState();

      const game = useGameStore.getState();

      if (e.key === 'Escape') {
        if (ui.searchOpen) return; // a própria paleta trata
        const phone = usePhoneStore.getState();
        if (game.panelOpen) game.closePanel();
        else if (ui.drawer) ui.closeDrawer();
        // O celular vem antes da seleção: volta uma tela e, no primeiro nível, recolhe o aparelho.
        else if (phone.montado && phone.aberto && phone.voltar()) return;
        else if (phone.montado && phone.aberto) phone.setAberto(false);
        else if (ui.buildMode) ui.setBuildMode(false);
        // Nos interiores: fecha o painel aberto (formulário, detalhe, artigo) e só então sai do cenário.
        else if (ui.interior && painelDoInterior(ui.interior).voltar()) return;
        else if (ui.interior) ui.exitInterior();
        else if (ui.selected) ui.clearSelection();
        else if (ui.yard) ui.exitYard();
        return;
      }

      if (isTyping(e.target) || ui.searchOpen || ui.drawer) return;
      const c = ui.controls;

      switch (e.key.toLowerCase()) {
        case '/':
          e.preventDefault();
          ui.setSearchOpen(true);
          break;
        case 'l': {
          const prefs = usePrefsStore.getState();
          prefs.setViewMode(prefs.viewMode === 'lista' ? '3d' : 'lista');
          break;
        }
        case 'g':
          if (game.panelOpen) game.closePanel();
          else game.openPanel();
          break;
        case 'b':
          if (ui.yard) ui.openDrawer({ form: 'nova-atividade', idProjeto: ui.yard });
          else ui.setBuildMode(!ui.buildMode);
          break;
        case 'q':
          rotateQuarter(c, -1);
          break;
        case 'e':
          rotateQuarter(c, 1);
          break;
        case 'h':
          ui.clearSelection();
          goHome(c);
          break;
        case '+':
        case '=':
          zoomStep(c, 1);
          break;
        case '-':
          zoomStep(c, -1);
          break;
        case 'w':
        case 'arrowup':
          e.preventDefault();
          panStep(c, 0, PAN);
          break;
        case 's':
        case 'arrowdown':
          e.preventDefault();
          panStep(c, 0, -PAN);
          break;
        case 'a':
        case 'arrowleft':
          e.preventDefault();
          panStep(c, -PAN, 0);
          break;
        case 'd':
        case 'arrowright':
          e.preventDefault();
          panStep(c, PAN, 0);
          break;
      }
    }

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
}
