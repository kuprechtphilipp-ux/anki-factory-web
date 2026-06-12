import { LegalPageLayout } from '@/components/legal/legal-page-layout'

export const metadata = {
  title: 'AGB — Cramo',
}

export default function AgbPage() {
  return (
    <LegalPageLayout title="Allgemeine Geschäftsbedingungen (AGB)" stand="12. Juni 2026">
      <h2>1. Geltungsbereich</h2>
      <p>
        Diese AGB gelten für die Nutzung der Webanwendung Cramo (cramo.ch), angeboten
        von Philipp Kuprecht, Einzelunternehmen, Gerhaldenstrasse 45, 9008 St. Gallen,
        Schweiz (nachfolgend &quot;Cramo&quot; oder &quot;wir&quot;). Mit der Registrierung eines
        Accounts akzeptierst du diese AGB sowie unsere{' '}
        <a href="/datenschutz">Datenschutzerklärung</a>.
      </p>

      <h2>2. Leistungsbeschreibung</h2>
      <p>
        Cramo ist eine webbasierte Lernanwendung, mit der du eigene Lerndokumente
        (z. B. PDFs) hochladen kannst. Mithilfe von KI-Modellen (Anthropic Claude)
        erstellt Cramo daraus automatisch Karteikarten und Quizfragen. Diese kannst du
        überarbeiten, organisieren und mit einem Spaced-Repetition-Algorithmus (FSRS)
        lernen.
      </p>
      <p>
        Cramo befindet sich in laufender Entwicklung. Einzelne Funktionen können
        ergänzt, geändert oder eingestellt werden. Während der Beta-Phase kann es zu
        Einschränkungen in Verfügbarkeit und Funktionsumfang kommen.
      </p>

      <h2>3. Registrierung und Konto</h2>
      <ul>
        <li>Für die Nutzung von Cramo ist ein Benutzerkonto erforderlich.</li>
        <li>
          Du bist verpflichtet, bei der Registrierung wahrheitsgemässe Angaben zu
          machen und deine Zugangsdaten vertraulich zu behandeln.
        </li>
        <li>
          Cramo richtet sich an Personen ab 16 Jahren. Bist du jünger, ist die
          Zustimmung deiner Erziehungsberechtigten erforderlich.
        </li>
        <li>
          Du kannst dein Konto jederzeit selbst über die Account-Einstellungen
          unwiderruflich löschen.
        </li>
      </ul>

      <h2>4. Pläne, Preise und Zahlung</h2>
      <p>Cramo bietet folgende Pläne an (Stand siehe oben, Preise verstehen sich in CHF inkl. allfälliger Abgaben):</p>
      <ul>
        <li><strong>Basic</strong> — kostenlos, mit begrenztem monatlichem Nutzungskontingent</li>
        <li><strong>Basic+</strong> — CHF 4.90 / Monat</li>
        <li><strong>Premium</strong> — CHF 9.90 / Monat</li>
        <li><strong>Ultra</strong> — CHF 16.90 / Monat</li>
      </ul>
      <p>
        Die jeweils aktuellen Preise und enthaltenen Leistungen werden dir vor
        Vertragsschluss in der Anwendung angezeigt. Die Zahlungsabwicklung erfolgt über
        unseren Zahlungsdienstleister Stripe (Kreditkarte, Twint, PayPal, je nach
        Verfügbarkeit). Kostenpflichtige Pläne werden monatlich im Voraus abgerechnet
        und verlängern sich automatisch um jeweils einen Monat, sofern sie nicht
        gekündigt werden.
      </p>

      <h2>5. Laufzeit, Kündigung und Plan-Wechsel</h2>
      <ul>
        <li>
          Du kannst dein Abonnement jederzeit über die Account-Einstellungen
          kündigen. Die Kündigung wird auf das Ende der aktuellen
          Abrechnungsperiode wirksam; bis dahin bleibt der gebuchte Plan aktiv.
        </li>
        <li>
          Ein Wechsel zwischen kostenpflichtigen Plänen ist jederzeit möglich. Bei
          einem Wechsel wird die Differenz zum bisherigen Plan anteilig
          (pro-rata) verrechnet bzw. gutgeschrieben.
        </li>
        <li>
          Bereits erbrachte Leistungen bzw. abgelaufene Abrechnungsperioden werden
          nicht rückwirkend erstattet, soweit gesetzlich nichts anderes vorgesehen ist.
        </li>
      </ul>

      <h2>6. Widerrufsrecht für Verbraucher:innen aus der EU/EWR</h2>
      <p>
        Wenn du als Verbraucher:in aus der EU/EWR ein kostenpflichtiges Abonnement
        abschliesst, steht dir grundsätzlich ein 14-tägiges Widerrufsrecht zu. Da es
        sich bei Cramo um eine digitale Dienstleistung handelt, die mit deiner
        ausdrücklichen Zustimmung sofort bereitgestellt wird, kann dieses
        Widerrufsrecht mit Beginn der Nutzung erlöschen, sofern du dem vor
        Vertragsschluss ausdrücklich zugestimmt hast. Unabhängig davon kannst du dein
        Abonnement gemäss Ziffer 5 jederzeit zum Ende der laufenden Periode kündigen.
      </p>

      <h2>7. Deine hochgeladenen Inhalte</h2>
      <ul>
        <li>
          Du bist allein dafür verantwortlich, dass du an den von dir hochgeladenen
          Dokumenten (z. B. Vorlesungsunterlagen, Skripte) die erforderlichen Rechte
          besitzt bzw. diese im Rahmen der gesetzlichen Schranken (z. B. Eigengebrauch
          zu privaten Lernzwecken) verwenden darfst.
        </li>
        <li>
          Lade keine Dokumente hoch, die Rechte Dritter (z. B. Urheberrechte oder
          Persönlichkeitsrechte) verletzen, oder die besonders schützenswerte
          Personendaten Dritter (z. B. Gesundheitsdaten) enthalten, ohne dass du dazu
          berechtigt bist.
        </li>
        <li>
          Deine hochgeladenen Inhalte und die daraus generierten Lerninhalte
          bleiben dein Eigentum bzw. stehen dir zur privaten Nutzung zu. Wir nutzen
          diese Inhalte ausschliesslich zur Erbringung der Cramo-Leistungen
          (insbesondere zur Generierung von Karteikarten via Anthropic Claude) und
          geben sie nicht für andere Zwecke an Dritte weiter.
        </li>
      </ul>

      <h2>8. KI-generierte Inhalte</h2>
      <p>
        Karteikarten, Quizfragen und Antworten des KI-Tutors werden automatisiert mit
        Hilfe von KI-Modellen erstellt. Diese Inhalte können fehlerhaft, unvollständig
        oder ungenau sein. Bitte überprüfe automatisch generierte Inhalte vor dem
        Lernen kritisch. Cramo übernimmt keine Gewähr für die fachliche Richtigkeit der
        generierten Inhalte und haftet nicht für Nachteile (z. B. im Rahmen von
        Prüfungen), die aus der Nutzung dieser Inhalte entstehen.
      </p>

      <h2>9. Verfügbarkeit und Änderungen</h2>
      <p>
        Wir bemühen uns um eine möglichst unterbrechungsfreie Verfügbarkeit von Cramo,
        können diese jedoch nicht garantieren (z. B. bei Wartungsarbeiten oder
        Ausfällen bei Drittanbietern wie Hosting- oder KI-Diensten). Wir behalten uns
        vor, Funktionen von Cramo anzupassen, zu erweitern oder einzustellen.
      </p>

      <h2>10. Haftung</h2>
      <p>
        Wir haften nicht für Schäden, die auf leichter Fahrlässigkeit beruhen, soweit
        gesetzlich zulässig. Die Haftung für grobe Fahrlässigkeit und Vorsatz bleibt
        unberührt. Für Inhalte und Dienste von Drittanbietern (z. B. Anthropic,
        Stripe) gelten deren eigene Bedingungen.
      </p>

      <h2>11. Sperrung von Konten</h2>
      <p>
        Wir behalten uns vor, Konten zu sperren oder zu löschen, wenn diese AGB,
        geltendes Recht oder die Bedingungen unserer Drittanbieter verletzt werden
        (z. B. Hochladen rechtswidriger Inhalte, Missbrauch der KI-Funktionen).
      </p>

      <h2>12. Datenschutz</h2>
      <p>
        Informationen zur Verarbeitung deiner personenbezogenen Daten findest du in
        unserer <a href="/datenschutz">Datenschutzerklärung</a>.
      </p>

      <h2>13. Änderungen dieser AGB</h2>
      <p>
        Wir können diese AGB mit Wirkung für die Zukunft anpassen, etwa bei neuen
        Funktionen oder rechtlichen Anforderungen. Über wesentliche Änderungen
        informieren wir dich, z. B. per E-Mail oder in der Anwendung.
      </p>

      <h2>14. Anwendbares Recht und Gerichtsstand</h2>
      <p>
        Es gilt Schweizer Recht unter Ausschluss des UN-Kaufrechts. Soweit gesetzlich
        zulässig, ist Gerichtsstand St. Gallen, Schweiz. Für Verbraucher:innen mit
        Wohnsitz in der EU/EWR bleiben zwingende Bestimmungen ihres
        Heimatrechts unberührt.
      </p>

      <h2>15. Kontakt</h2>
      <p>
        Bei Fragen zu diesen AGB erreichst du uns unter{' '}
        <a href="mailto:hello@cramo.ch">hello@cramo.ch</a>.
      </p>
    </LegalPageLayout>
  )
}
