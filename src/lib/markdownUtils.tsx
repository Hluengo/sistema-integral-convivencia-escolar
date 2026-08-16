/** @license SPDX-License-Identifier: Apache-2.0 */

export function BoldText({
  text,
  strongClass = 'font-bold text-neutral-950',
}: {
  text: string;
  strongClass?: string;
}) {
  const parts = text.split('**');
  return (
    <>
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <strong key={`b-${part}`} className={strongClass}>
            {part}
          </strong>
        ) : (
          <span key={`t-${part}`}>{part}</span>
        ),
      )}
    </>
  );
}
