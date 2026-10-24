export const meta = {
  name: 'bni-script-polish',
  description: 'Sonnet rédige 3 variantes de réplique par membre, Opus juge et tranche, Opus critique le script global',
  phases: [
    { title: 'Variantes', detail: 'Sonnet : 3 variantes par membre', model: 'sonnet' },
    { title: 'Arbitrage', detail: 'Opus : choisit et affine par membre', model: 'opus' },
    { title: 'Critique globale', detail: 'Opus : rythme, répétition, droit, recommandation', model: 'opus' },
  ],
}
// args = { chapter, constraints, members: [{id,name,company,line,activity,ideal_contact,prop,pronunciation}] }
const VARIANTS = { type: 'object', properties: { variants: { type: 'array', items: { type: 'string' } } }, required: ['variants'] }
const PICK = { type: 'object', properties: { final: { type: 'string' }, words: { type: 'number' }, why: { type: 'string' }, risk: { type: 'string' } }, required: ['final', 'why'] }
const CRIT = { type: 'object', properties: { issues: { type: 'array', items: { type: 'string' } }, rewrites: { type: 'array', items: { type: 'object', properties: { id: { type: 'string' }, line: { type: 'string' } }, required: ['id', 'line'] } }, legal: { type: 'array', items: { type: 'string' } } }, required: ['issues', 'rewrites', 'legal'] }

const rules = `Contraintes : français oral, 18 à 28 mots (≈8 à 10 s parlées), un jeu de mots judo sans cliché, nommer l'entreprise, finir par un appel à recommandation ("Je cherche : ...") si ideal_contact est renseigné. Ne jamais inventer de fait sur l'activité : s'il manque une donnée, écrire [DONNÉE MANQUANTE] plutôt qu'improviser. ${args.constraints || ''}`

const picked = await pipeline(
  args.members,
  m => agent(`Chapitre BNI "${args.chapter}". Membre : ${JSON.stringify(m)}.\nRéplique actuelle : "${m.line}".\nÉcris 3 variantes nettement différentes (angle, ton, structure). ${rules}`,
    { phase: 'Variantes', model: 'sonnet', schema: VARIANTS, label: `variantes:${m.id}` }),
  (v, m) => agent(`Membre : ${JSON.stringify(m)}.\nOriginal : "${m.line}".\nVariantes : ${JSON.stringify(v.variants)}.\nChoisis la meilleure ou fusionne, vérifie chaque affirmation contre les données du membre, compte les mots. ${rules}`,
    { phase: 'Arbitrage', model: 'opus', schema: PICK, label: `arbitre:${m.id}` }).then(p => ({ id: m.id, ...p }))
)
const lines = picked.filter(Boolean)
if (lines.length < args.members.length) log(`Attention : ${args.members.length - lines.length} membre(s) sans réplique finale`)

phase('Critique globale')
const crit = await agent(`Script complet d'une vidéo BNI de 2 min 48 (8 membres, thème judo/tournoi, mot "JO" conservé par choix du commanditaire). Répliques : ${JSON.stringify(lines)}.\nRôle d'avocat du diable : repère répétition de structure, rythme, vague, risque de marque (JO/CIO/CNOSF), ce que le public retient. Propose des réécritures ciblées uniquement si le gain est net.`,
  { phase: 'Critique globale', model: 'opus', schema: CRIT, label: 'critique' })
return { lines, critique: crit }
