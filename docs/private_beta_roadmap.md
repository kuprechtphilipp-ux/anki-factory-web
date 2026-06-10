

### Schritt 1: Der "AI Tutor (Cramo der Waschbär)"-Tab in der Sidebar (Tag 3)

Seine Persönlichkeit: Cramo ist ein KI-Tutor im "Storytelling"-Stil, inspiriert von Brian, der als sympathischer, aber sichtlich überarbeiteter Waschbär mit Kaffeeabhängigkeit und tiefen Augenringen auftritt. Als Spezialist für das "Büffeln" (Cramming) in der Nachtschicht vor Prüfungen, verarbeitet er hochgeladene Vorlesungsunterlagen und PDFs blitzschnell zu strukturierten Karteikarten. Seine Persönlichkeit ist eine Mischung aus solidarischem "Ich fühle deinen Schmerz"-Kumpel und effizientem HSG-Elite-Lerner, der den Usern dezent das Gefühl gibt, smarter als die Konkurrenz zu lernen.

Seine Icons sind hier abgelegt: /Users/philippkuprecht/Desktop/anki-factory-web/public/icons/Cramo_Icons. - sie können bei Bedarf mit der Canva MCP connection von Claude bearbeitet werden.

Wir fügen den neuen Tab in der Sidebar hinzu und bauen den Split-Screen-Bereich (Hilfe & Motivation).

#### 📝 Prompt für Claude Code:
```text
Erstelle einen neuen Bereich für den "AI Tutor":
1. Füge in der Sidebar (unter Statistik) einen neuen Menüpunkt "AI Tutor" (mit einem passenden Icon, z. B. Sparkles oder Brain) hinzu, der auf /tutor verweist.
2. Erstelle die Seite app/(app)/tutor/page.tsx als modernen Split-Screen (zwei Spalten auf Desktop, gestapelt auf Mobile):
   - Linke Spalte: "Hilfe & Fragen". Ein interaktives Chatbot-Interface. Hier kann der User dem Tutor Fragen zu seinen Lernmaterialien stellen.
   - Rechte Spalte: "Motivation & Status". Ein Bereich, in dem der KI-Tutor eine personalisierte Motivationsnachricht anzeigt (basierend auf der aktuellen Lern-Streak des Users, den letzten fälligen Karten und dem Fachgebiet).
3. Erstelle eine API-Route app/api/chat/route.ts, die Anfragen an die Anthropic-API (Claude Haiku) leitet. Die Route soll das generier_profil des Users sowie den Namen des aktuellen Themas/Kurses auslesen, um dem Tutor Kontext zu geben.
4. Füge auf der Seite eine Lade-Animation hinzu, während der Motivations-Spruch geladen wird. Coche das Ergebnis für die Session, damit nicht bei jedem Klick API-Kosten entstehen.
```

---

### Schritt 2: Das Onboarding (Tag 3)

Einmalige Begrüßung für neue User zur Erfassung des Fachgebiets.

#### 📝 Prompt für Claude Code:
```text
Erstelle ein personalisiertes User-Onboarding:
1. Prüfe in der User-Datenbank (z. B. Tabelle generier_profil oder profiles), ob für den User onboarding_completed auf false steht.
2. Falls false, zeige beim ersten Laden des Dashboards ein elegantes Willkommens-Modal (Cramo Waschbär) an.
3. Der AI Tutor (Cramo der Waschbär) begrüßt den Nutzer freundlich und erfasst in 2-3 einfachen Fragen: Fachbereich/Studienfach, das wichtigste Lernziel und das zeitliche Lernfenster (z. B. "Sehr gestresst", "Normal", "Entspannt").
4. Speichere diese Daten im generier_profil des Users und setze onboarding_completed: true.
5. Stelle sicher, dass das Onboarding danach nie wieder erscheint.
```
