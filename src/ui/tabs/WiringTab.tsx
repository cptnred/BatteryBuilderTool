import type { Issue, Layout, SubPack } from '../../core';
import type { TopAlign } from '../../view/topModel';
import { FaceView } from '../views/FaceView';
import { Issues } from '../views/Issues';
import { Legend } from '../views/Legend';
import { TopView } from '../views/TopView';

interface Props {
  layout: Layout;
  issues: Issue[];
  align: TopAlign;
  onAlign: (a: TopAlign) => void;
}

export function WiringTab({ layout, issues, align, onAlign }: Props) {
  const main = layout.packs.filter((p) => p.role === 'main');
  const boosters = layout.packs.filter((p) => p.role === 'booster');
  // ungleich breit: im Hauptpack oder unter den Einzelpacks des Boosters
  const widths = (ps: SubPack[]) => new Set(ps.map((p) => p.width.toFixed(2))).size;
  const uneven = widths(main) > 1 || widths(boosters) > 1;
  return (
    <div className="wiring">
      <div className="wiring__top">
        <div className="mat">
          <TopView layout={layout} align={align} />
          {uneven && (
            <div className="inline-choice" role="group" aria-label="Ausrichtung ungleich breiter Teilpacks">
              <span>Bündig:</span>
              {(['left', 'center', 'right'] as const).map((a) => (
                <button
                  key={a}
                  type="button"
                  className={'chip chip--small' + (align === a ? ' is-on' : '')}
                  aria-pressed={align === a}
                  onClick={() => onAlign(a)}
                >
                  {a === 'left' ? 'links' : a === 'center' ? 'mittig' : 'rechts'}
                </button>
              ))}
            </div>
          )}
        </div>
        <Issues issues={issues} />
      </div>
      <div className="faces">
        {main.map((p) => (
          <div className="faces__row mat" key={p.key}>
            <FaceView layout={layout} pack={p} face="V" />
            <FaceView layout={layout} pack={p} face="H" />
          </div>
        ))}
        {boosters.map((p) => (
          <div className="faces__row mat faces__row--booster" key={p.key}>
            <FaceView layout={layout} pack={p} face="V" />
            <FaceView layout={layout} pack={p} face="H" />
          </div>
        ))}
      </div>
      <Legend layout={layout} />
    </div>
  );
}
