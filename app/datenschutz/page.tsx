import { LegalPageLayout } from '@/components/legal/legal-page-layout'

export const metadata = {
  title: 'Datenschutzerklärung — Cramo',
}

export default function DatenschutzPage() {
  return (
    <LegalPageLayout title="Datenschutzerklärung" stand="12. Juni 2026">
      <h2>1. Verantwortlicher</h2>
      <p>
        Verantwortlich für die Datenverarbeitung im Zusammenhang mit Cramo ist:
        <br />
        <strong>Philipp Kuprecht</strong>, Gerhaldenstrasse 45, 9008 St. Gallen, Schweiz
        <br />
        E-Mail: <a href="mailto:hello@cramo.ch">hello@cramo.ch</a>
      </p>
      <p>
        Diese Datenschutzerklärung gilt für die Nutzung der Cramo-Webanwendung
        (cramo.ch) und orientiert sich am revidierten Schweizer Datenschutzgesetz (DSG)
        sowie, soweit Nutzer:innen aus der EU/EWR betroffen sind, an der
        Datenschutz-Grundverordnung (DSGVO).
      </p>

      <h2>2. Welche Daten wir verarbeiten</h2>
      <h3>2.1 Account- und Profildaten</h3>
      <ul>
        <li>E-Mail-Adresse und Passwort (verschlüsselt) bei der Registrierung</li>
        <li>Angaben aus dem Onboarding (z. B. Fachbereich, Lernziele)</li>
        <li>Abo-/Plan-Status und Nutzungs-/Credit-Verbrauch</li>
      </ul>

      <h3>2.2 Lerninhalte</h3>
      <ul>
        <li>Von dir hochgeladene PDF-Dokumente (z. B. Vorlesungsfolien, Skripte)</li>
        <li>Daraus generierte Karteikarten, Quizfragen, Tags und Kontextinformationen</li>
        <li>
          Lernfortschritt und Wiederholungsdaten (Spaced-Repetition/FSRS, z. B.
          Bewertungen, Fälligkeitsdaten, Lern-Streaks)
        </li>
        <li>Chatverläufe mit dem KI-Tutor (&quot;Cramo&quot;)</li>
      </ul>

      <h3>2.3 Zahlungsdaten</h3>
      <p>
        Zahlungsdaten (z. B. Kreditkarten-, Twint- oder PayPal-Informationen) werden
        ausschliesslich von unserem Zahlungsdienstleister Stripe verarbeitet. Wir selbst
        erhalten und speichern keine vollständigen Zahlungsdaten, sondern nur
        Abo-Status, Plan und eine Stripe-Kunden-/Abonnement-Referenz.
      </p>

      <h3>2.4 Technische Daten</h3>
      <p>
        Beim Aufruf der Anwendung werden durch unseren Hosting-Anbieter (Vercel)
        technisch notwendige Daten verarbeitet (z. B. IP-Adresse, Zeitpunkt des
        Zugriffs), um die Anwendung sicher und stabil bereitzustellen.
      </p>

      <h2>3. Zweck der Verarbeitung</h2>
      <ul>
        <li>Bereitstellung deines Accounts und Speicherung deiner Lerninhalte</li>
        <li>
          Automatische Erstellung von Karteikarten und Quizfragen aus deinen
          hochgeladenen Dokumenten mittels KI
        </li>
        <li>Berechnung deines individuellen Lernplans (Spaced Repetition)</li>
        <li>Abwicklung von Bezahlvorgängen für kostenpflichtige Pläne</li>
        <li>Betrieb, Sicherheit und Weiterentwicklung der Anwendung</li>
      </ul>

      <h2>4. Weitergabe an Drittanbieter (Auftragsverarbeiter)</h2>
      <p>
        Zur Bereitstellung von Cramo setzen wir folgende Drittanbieter ein, die in
        unserem Auftrag Daten verarbeiten:
      </p>
      <ul>
        <li>
          <strong>Supabase</strong> (Datenbank, Authentifizierung) — Speicherung von
          Account-, Profil- und Lerninhaltsdaten, Hosting der Datenbank in der
          EU (Frankfurt, Deutschland)
        </li>
        <li>
          <strong>Anthropic (Claude API)</strong> — von dir hochgeladene PDF-Inhalte
          und Texte werden zur Erstellung von Karteikarten, Quizfragen und für den
          KI-Tutor an die Anthropic-API übermittelt und dort verarbeitet. Anthropic
          mit Sitz in den USA nutzt diese Daten gemäss eigenen API-Bedingungen nicht
          zum Training seiner Modelle.
        </li>
        <li>
          <strong>Stripe</strong> — Abwicklung von Zahlungen und Abonnements (Sitz
          u. a. USA/Irland)
        </li>
        <li>
          <strong>Vercel</strong> — Hosting der Webanwendung (Sitz USA, Server-Standorte
          auch in der EU)
        </li>
      </ul>
      <p>
        Mit diesen Anbietern bestehen entsprechende Vereinbarungen zur
        Auftragsverarbeitung bzw. deren Standardvertragsbedingungen. Eine Weitergabe
        deiner Daten an sonstige Dritte erfolgt nicht, ausser wenn wir gesetzlich dazu
        verpflichtet sind.
      </p>

      <h2>5. Datenübermittlung in Drittstaaten (insb. USA)</h2>
      <p>
        Ein Teil der oben genannten Anbieter (Anthropic, Stripe, Vercel) hat seinen
        Sitz oder Serverstandorte in den USA. Bei einer Übermittlung von Daten in die
        USA stützen wir uns auf die Zertifizierung der jeweiligen Anbieter unter dem
        Swiss-U.S. Data Privacy Framework bzw. auf Standardvertragsklauseln, soweit
        diese anwendbar sind, um ein angemessenes Datenschutzniveau sicherzustellen.
      </p>

      <h2>6. Speicherdauer</h2>
      <p>
        Wir speichern deine Daten, solange dein Account besteht. Du kannst dein Konto
        jederzeit in den Account-Einstellungen löschen; dabei werden dein Profil, deine
        Kurse, Karteikarten, Lernfortschritte und sonstigen personenbezogenen Daten
        unwiderruflich gelöscht. Gesetzliche Aufbewahrungspflichten (z. B. für
        Zahlungsbelege) bleiben davon unberührt.
      </p>

      <h2>7. Deine Rechte</h2>
      <p>Du hast jederzeit das Recht auf:</p>
      <ul>
        <li>Auskunft über die von uns verarbeiteten Daten</li>
        <li>Berichtigung unrichtiger Daten</li>
        <li>Löschung deiner Daten (z. B. über &quot;Konto löschen&quot; in den Einstellungen)</li>
        <li>Einschränkung der Verarbeitung sowie Datenübertragbarkeit</li>
        <li>
          Beschwerde bei der zuständigen Aufsichtsbehörde (in der Schweiz: Eidgenössischer
          Datenschutz- und Öffentlichkeitsbeauftragter, EDÖB)
        </li>
      </ul>
      <p>
        Für Anfragen zu deinen Daten wende dich an{' '}
        <a href="mailto:hello@cramo.ch">hello@cramo.ch</a>.
      </p>

      <h2>8. Cookies</h2>
      <p>
        Cramo verwendet ausschliesslich technisch notwendige Cookies (z. B. für
        Login-Sitzungen). Es werden keine Cookies zu Werbe- oder
        Analysezwecken eingesetzt.
      </p>

      <h2>9. Minderjährige</h2>
      <p>
        Cramo richtet sich nicht an Kinder unter 16 Jahren. Sollten wir feststellen,
        dass ein Account von einer Person unter 16 Jahren ohne Einwilligung der
        Erziehungsberechtigten angelegt wurde, behalten wir uns vor, diesen Account zu
        löschen.
      </p>

      <h2>10. Datensicherheit</h2>
      <p>
        Wir setzen technische und organisatorische Massnahmen ein (z. B.
        Transportverschlüsselung, Zugriffsbeschränkungen), um deine Daten gegen
        Verlust, Missbrauch und unbefugten Zugriff zu schützen.
      </p>

      <h2>11. Änderungen dieser Erklärung</h2>
      <p>
        Wir passen diese Datenschutzerklärung an, wenn sich die Verarbeitung deiner
        Daten ändert (z. B. neue Funktionen oder Drittanbieter). Die jeweils aktuelle
        Version ist auf dieser Seite abrufbar.
      </p>

      <h2>12. Kontakt</h2>
      <p>
        Fragen zum Datenschutz richtest du bitte an{' '}
        <a href="mailto:hello@cramo.ch">hello@cramo.ch</a>.
      </p>
    </LegalPageLayout>
  )
}
