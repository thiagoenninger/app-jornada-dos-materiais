export default function MaterialGrid({ materials, onChoose, pressedId, disabled }) {
  return (
    <div className="grid-view">
      <header className="grid-view__header">
        <h1>Jornada dos Materiais</h1>
        <p>Escolha um material e acompanhe sua jornada nas telas!</p>
      </header>

      <div className="grid">
        {materials.map((material) => (
          <button
            key={material.id}
            className={pressedId === material.id ? 'card card--pressed' : 'card'}
            style={{ borderColor: material.color }}
            onClick={() => onChoose(material.id)}
            disabled={disabled}
          >
            <div
              className="card__image"
              style={{ backgroundImage: `url(/content/${material.cardImage})` }}
            />
            <div className="card__body">
              <h2 className="card__name">{material.name}</h2>
              {material.tagline && <p className="card__tagline">{material.tagline}</p>}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
