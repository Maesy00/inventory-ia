/*
 * categories.js — les catégories culturelles de l'inventaire.
 * Direction "Programme" : pas d'icônes ni de couleurs par catégorie,
 * seul le libellé (composé en majuscules) distingue chaque entrée.
 */

const CATEGORIES = [
  {
    id: "film",
    label: "Film",
    mediumLabel: "Diffusion",
    mediums: ["Streaming", "Cinéma", "Télévision"],
  },
  {
    id: "serie",
    label: "Série",
    mediumLabel: "Diffusion",
    mediums: ["Streaming", "Télévision"],
  },
  { id: "documentaire", label: "Documentaire" },
  {
    id: "livre",
    label: "Livre",
    hasAuthor: true,
    mediumLabel: "Type",
    mediums: ["Roman", "BD", "Manga", "Essai", "Biographie", "Poésie", "Nouvelles"],
  },
  { id: "spectacle", label: "Spectacle", hasLocation: true },
  { id: "theatre", label: "Théâtre", hasLocation: true },
  { id: "exposition", label: "Exposition", hasLocation: true },
];
