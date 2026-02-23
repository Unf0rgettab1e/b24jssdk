export function showProgress(createdCount: number, total: number): void {
  const percentage = Math.round((createdCount / total) * 100)

  const progressBarLength = 20
  const filledLength = Math.floor((percentage / 100) * progressBarLength)
  const progressBar = '█'.repeat(filledLength) + '░'.repeat(progressBarLength - filledLength)

  process.stdout.clearLine(0)
  process.stdout.cursorTo(0)
  process.stdout.write(`\rProgress: [${progressBar}] ${percentage}% (${createdCount}/${total})`)
}
