import type { Layout } from '../../core';
import { assumptions } from '../../view/assumptions';

export function Legend({ layout }: { layout: Layout }) {
  return (
    <section className="legend" aria-label="Legende und Annahmen">
      <div className="legend__keys">
        <h3>Legende</h3>
        <ul>
          <li>
            <span className="key sym--minus">−</span> Minuspol sichtbar
          </li>
          <li>
            <span className="key sym--plus">+</span> Pluspol sichtbar
          </li>
          <li>
            <span className="key key--ni" /> Nickelstreifen (abwechselnd dunkel/hell)
          </li>
          <li>
            <span className="key key--num">7</span> Zahl in der Zelle = Seriengruppe
          </li>
          <li>
            <span className="key key--bk">Bk</span> Balancer-Abgriff (B0 = Hauptminus)
          </li>
          <li>
            <span className="key key--bridge" /> Brücke / Verbindung zum Nachbarpack
          </li>
          <li>
            <span className="key key--rl">R L</span> echte Seite (Vorderseite ist gespiegelt)
          </li>
        </ul>
      </div>
      <div className="legend__notes">
        <h3>Aufbau und Annahmen</h3>
        <ul>
          {assumptions(layout).map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
      </div>
    </section>
  );
}
