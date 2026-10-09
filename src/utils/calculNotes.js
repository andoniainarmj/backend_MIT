const POIDS = { cc1: 0.2, cc2: 0.3, examen: 0.5 };

const arrondir = (n) => Math.round(n * 100) / 100;

const calculerMoyenne = (note) => {
  const { cc1, cc2, examen } = note;
  if ([cc1, cc2, examen].some((v) => v === null || v === undefined)) {
    return null;
  }
  return arrondir(cc1 * POIDS.cc1 + cc2 * POIDS.cc2 + examen * POIDS.examen);
};

const statutMatiere = (moyenne) => {
  if (moyenne === null) return "En cours";
  if (moyenne >= 14) return "Très Bien";
  if (moyenne >= 10) return "Admis";
  return "Ajourné";
};

const mention = (moyenne) => {
  if (moyenne === null) return null;
  if (moyenne >= 16) return "Très Bien";
  if (moyenne >= 14) return "Bien";
  if (moyenne >= 12) return "Assez Bien";
  if (moyenne >= 10) return "Passable";
  return "Insuffisant";
};

// lignes : [{ moyenne, coefficient, ects }]
const calculerResume = (lignes) => {
  let somme = 0;
  let coefs = 0;
  let ectsValides = 0;

  lignes.forEach((l) => {
    if (l.moyenne !== null) {
      somme += l.moyenne * l.coefficient;
      coefs += l.coefficient;
      if (l.moyenne >= 10) ectsValides += l.ects;
    }
  });

  const moyenneGenerale = coefs > 0 ? arrondir(somme / coefs) : null;
  return {
    moyenne_generale: moyenneGenerale,
    mention: mention(moyenneGenerale),
    ects_valides: ectsValides,
  };
};

const distribution = (moyennes) => {
  const total = moyennes.length;
  const part = (n) => (total ? Math.round((n / total) * 100) : 0);
  return {
    excellent: part(moyennes.filter((m) => m >= 16).length),
    bien: part(moyennes.filter((m) => m >= 12 && m < 16).length),
    passable: part(moyennes.filter((m) => m >= 10 && m < 12).length),
    insuffisant: part(moyennes.filter((m) => m < 10).length),
  };
};

module.exports = {
  arrondir,
  calculerMoyenne,
  statutMatiere,
  mention,
  calculerResume,
  distribution,
};
