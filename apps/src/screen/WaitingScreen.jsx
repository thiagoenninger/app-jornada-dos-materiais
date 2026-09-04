export default function WaitingScreen({ stageNumber, stageTitle, stageSubtitle }) {
  return (
    <div className="waiting">
      <div className="waiting__number">{stageNumber}</div>
      <h1 className="waiting__title">{stageTitle ?? '-'}</h1>
      {stageSubtitle && <p className="waiting__subtitle">{stageSubtitle}</p>}
    </div>
  );
}
