<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Kalbos

Svetainė turi dvi nepriklausomas kalbas: `en` (`src/content/copy.en.ts`) ir
`lt` (`src/content/copy.lt.ts`). Tai NE originalas ir vertimas — tai du
atskiri turinio šaltiniai.

Kai prašoma pakeisti tekstą, keisk tik tos vienos kalbos failą. Niekada
neversk ir neatnaujink antrosios kalbos „kad sutaptų". Jei atrodo, kad
antroji kalba atsiliko, pasakyk apie tai atsakyme, bet failo nekeisk.

Nenaudok jokio vertimo API, jokios vertimo bibliotekos ir jokio automatinio
sinchronizavimo tarp šių dviejų failų.

Nenaudok fallback kalbos. Jei rakto trūksta, tai turi būti kompiliavimo
klaida, o ne kitos kalbos tekstas puslapyje.
