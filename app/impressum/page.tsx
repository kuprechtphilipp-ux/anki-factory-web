import { LegalPageLayout } from '@/components/legal/legal-page-layout'

export const metadata = {
  title: 'Impressum — Cramo',
}

export default function ImpressumPage() {
  return (
    <LegalPageLayout title="Impressum" stand="12. Juni 2026">
      <h2>Angaben gemäss Art. 3 UWG</h2>
      <p>
        <strong>Philipp Kuprecht</strong>
        <br />
        Einzelunternehmen (Cramo, nicht im Handelsregister eingetragen)
        <br />
        Gerhaldenstrasse 45
        <br />
        9008 St. Gallen
        <br />
        Schweiz
      </p>

      <h2>Kontakt</h2>
      <p>
        E-Mail: <a href="mailto:hello@cramo.ch">hello@cramo.ch</a>
      </p>

      <h2>Verantwortlich für den Inhalt</h2>
      <p>Philipp Kuprecht (Adresse wie oben).</p>

      <h2>Mehrwertsteuer</h2>
      <p>
        Das Unternehmen ist aktuell nicht im Mehrwertsteuerregister eingetragen, da der
        massgebende Jahresumsatz unter der gesetzlichen Schwelle liegt.
      </p>

      <h2>Haftungsausschluss</h2>
      <p>
        Cramo erstellt Lerninhalte (Karteikarten, Quizfragen) mithilfe von KI-Modellen auf
        Basis der von dir hochgeladenen Unterlagen. Trotz sorgfältiger Umsetzung kann keine
        Gewähr für die Richtigkeit, Vollständigkeit oder Aktualität der automatisch
        generierten Inhalte übernommen werden. Die Nutzung der Inhalte zur
        Prüfungsvorbereitung erfolgt in eigener Verantwortung.
      </p>
      <p>
        Für Inhalte externer Links wird keine Haftung übernommen. Es gilt das Recht des
        jeweiligen Anbieters.
      </p>

      <h2>Urheberrecht</h2>
      <p>
        Die Inhalte und Werke dieser Website (Texte, Design, Logos, Icons) sind, soweit
        nicht anders gekennzeichnet, urheberrechtlich geschützt. Eine Vervielfältigung oder
        Verwendung ausserhalb dieser Anwendung bedarf der vorherigen schriftlichen
        Zustimmung.
      </p>

      <h2>Streitbeilegung</h2>
      <p>
        Cramo nimmt nicht an einem alternativen Streitbeilegungsverfahren vor einer
        Verbraucherschlichtungsstelle teil.
      </p>
    </LegalPageLayout>
  )
}
