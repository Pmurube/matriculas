import { Modal } from './Modal.tsx';
import { Plate } from './Plate.tsx';
import { IconCheck, IconX } from './Icons.tsx';

const EXAMPLES: [string, boolean, string][] = [
  ['BARCO', true, 'B · R · C en orden'],
  ['BARCA', true, 'Mismas consonantes, otras vocales'],
  ['ABARCA', true, 'Vocales delante también valen'],
  ['BARRACA', false, 'Repite la R'],
  ['BARRANCO', false, 'Añade una N'],
  ['ABARCO', false, 'Verbo conjugado'],
];

export function HowToPlayModal({ onClose }: { onClose: () => void }) {
  return (
    <Modal title="Cómo jugar" onClose={onClose} wide>
      <div className="space-y-6 text-sm">
        <div>
          <Plate score={27} pattern="brc" explain className="max-w-sm" label="Ejemplo de matrícula 0027 BRC" />
          <div className="mx-auto mt-2 grid max-w-sm grid-cols-2 gap-2 text-xs">
            <span className="rounded-lg bg-road-soft p-2 text-road"><b>Números</b> = tu puntuación acumulada (siempre 4 cifras).</span>
            <span className="rounded-lg bg-combo-soft p-2 text-combo"><b>Letras</b> = el reto: las 3 consonantes que debes usar.</span>
          </div>
        </div>

        <section>
          <h3 className="mb-2 font-black uppercase tracking-wide">Reglas</h3>
          <ul className="list-disc space-y-1 pl-5">
            <li>Usa <b>exactamente</b> las tres consonantes, <b>una vez cada una</b> y <b>en el mismo orden</b>.</li>
            <li>Solo puedes <b>añadir vocales</b> (con o sin tilde). No añadas, quites, repitas ni cambies consonantes.</li>
            <li>La palabra debe estar en el diccionario del juego: sin nombres propios, abreviaturas, plurales ni verbos conjugados. Infinitivos, gerundios y participios sí.</li>
            <li>Puedes intentarlo las veces que quieras o pulsar <b>PASAR</b>.</li>
          </ul>
        </section>

        <section>
          <h3 className="mb-2 font-black uppercase tracking-wide">Ejemplos con BRC</h3>
          <ul className="grid gap-2 sm:grid-cols-2">
            {EXAMPLES.map(([w, ok, why]) => (
              <li key={w} className={`flex items-center gap-2 rounded-lg px-3 py-2 ${ok ? 'bg-road-soft' : 'bg-warn-soft'}`}>
                <span className={ok ? 'text-road' : 'text-warn'}>{ok ? <IconCheck /> : <IconX />}</span>
                <b className="plate-chars text-xl">{w}</b>
                <span className="text-xs text-muted">{why}</span>
                <span className="sr-only">{ok ? 'válida' : 'no válida'}</span>
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h3 className="mb-2 font-black uppercase tracking-wide">Puntuación</h3>
          <table className="w-full text-left">
            <tbody className="[&_td]:border-b [&_td]:border-ink/5 [&_td]:py-1.5">
              <tr><td>A, E, O</td><td className="text-right font-bold">+1 cada una</td></tr>
              <tr><td>I, U (Ü = U)</td><td className="text-right font-bold">+2 cada una</td></tr>
              <tr><td>5–6 letras · 7–8 · 9 o más</td><td className="text-right font-bold">+1 · +2 · +3</td></tr>
              <tr><td>Consonantes raras</td><td className="text-right font-bold">según configuración</td></tr>
              <tr><td>Combo en Contrarreloj (2.º acierto seguido · 3.º y más)</td><td className="text-right font-bold">+1 · +2</td></tr>
              <tr><td>Reto cumplido en Combo de vocales</td><td className="text-right font-bold">+3</td></tr>
            </tbody>
          </table>
          <p className="mt-2 text-xs text-muted">Fallar o pasar rompe el combo. Ejemplo: BARCO = 2 vocales (A, O) + 1 por 5 letras = 3 puntos.</p>
        </section>

        <section>
          <h3 className="mb-2 font-black uppercase tracking-wide">Modos</h3>
          <ul className="space-y-1">
            <li><b className="text-road">Contrarreloj</b>: 120 segundos, matrículas sin fin, combo.</li>
            <li><b>Clásico</b>: 10 matrículas sin reloj.</li>
            <li><b className="text-combo">Combo de vocales</b>: 10 matrículas con un reto extra cada una (+3 si lo cumples).</li>
          </ul>
        </section>
        <button type="button" className="btn-primary w-full" onClick={onClose}>Entendido</button>
      </div>
    </Modal>
  );
}
