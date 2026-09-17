# Automatinis nuotraukų apkirpimas pagal proporcijas

## Tikslas

Kai įkeliama nuotrauka, kurios proporcijos neatitinka angos reikalavimo (skirtumas > 1 %), sistema automatiškai apkirpo ją centriniu būdu iki reikiamo santykio — be papildomo patvirtinimo ir be įspėjimo dialogo.

## Kas keičiasi

Tik vienas failas: `src/components/admin/ImageUpload.tsx`.

### Dabar
- `expectedRatio` propas patikrina santykį; jei skirtumas > 1 %, parodo įspėjimą su „Vis tiek įkelti" / „Atšaukti".
- `prepareImage` tik sumažina iki `maxWidth` išlaikant originalias proporcijas — nekerta.

### Po pakeitimo
- `prepareImage` priima `expectedRatio`. Po sumažinimo iki `maxWidth` (išlaikant proporcijas), jei `expectedRatio` nurodytas ir skirtumas > 1 %, canvas apkirpamas centriniai:
  - tikslinis aukštis = `plotis / expectedRatio`
  - jei nuotraaka per aukšta — nukerpama viršus ir apačia (centrinis kirpimas)
  - jei per plati — nukerpama kairė ir dešinė (centrinis kirpimas)
- Įspėjimo dialogas (`ratioWarning` būsena, „Vis tiek įkelti" / „Atšaukti" mygtukai) pašalinamas.
- Įkėlimas vyksta iškart, be papildomo patvirtinimo.
- Po įkėlimo, jei buvo kirpta, rodomas pranešimas: „Nuotrauka automatiškai apkirpta pagal proporcijas".

## Kas nekeičiama

- Blog redaktorius (`admin.straipsniai.$id.tsx`) nenaudoja `expectedRatio` — jokios įtakos.
- Vaizdo įrašų įkėlimas (`VideoFileUpload`) — nekeičiamas, vaizdo įrašų nekertame.
- SVG failai — nekirpami (kaip ir dabar).
- WebP 0.82 konversija, `maxWidth` sumažinimas, Storage įkėlimas — tie patys.

## Patikrinimas

1. `bunx tsgo --noEmit` — be klaidų.
2. Playwright: prisijungus kaip administratorius, atidaryti `/admin/homepage`, įkelti nuotrauką su netinkamomis proporcijomis — turi įkelti automatiškai be dialogo, ir DB registruojamas kandidatas su teisingomis proporcijomis.
