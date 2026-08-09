import { ReportElement } from '@/types/reportBuilder';
import { BindingContext, renderBindings, buildSubitemRows } from '@/lib/reportBinding';


interface Props {
  element: ReportElement;
  preview: boolean;
  ctx: BindingContext;
}

export default function ElementRenderer({ element: el, preview, ctx }: Props) {
  const s = el.style;
  const text = preview ? renderBindings(el.content, ctx) : el.content;

  const baseStyle: React.CSSProperties = {
    width: '100%',
    height: '100%',
    color: s.color,
    background: s.background === 'transparent' ? undefined : s.background,
    borderWidth: s.borderWidth,
    borderStyle: s.borderWidth ? 'solid' : 'none',
    borderColor: s.borderColor,
    borderRadius: s.radius,
    padding: s.padding,
    fontSize: s.fontSize,
    fontWeight: s.fontWeight,
    fontStyle: s.italic ? 'italic' : 'normal',
    textAlign: s.align,
    opacity: s.opacity ?? 1,
    overflow: 'hidden',
    boxSizing: 'border-box',
  };

  if (el.type === 'separator') {
    return (
      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', opacity: s.opacity ?? 1 }}>
        <div style={{ width: '100%', borderTop: `${Math.max(1, s.borderWidth || 1)}px solid ${s.borderColor}` }} />
      </div>
    );
  }

  if (el.type === 'image') {
    return (
      <div style={{ ...baseStyle, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {el.src ? (
          <img src={el.src} alt={el.content || 'Logo do comprovante'} style={{ maxWidth: '100%', maxHeight: '100%' }} />
        ) : (
          <span style={{ fontSize: 11, color: '#94a3b8' }}>Logo / Imagem</span>
        )}
      </div>
    );
  }

  if (el.type === 'watermark') {
    return (
      <div
        style={{
          ...baseStyle,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transform: 'rotate(-18deg)',
          letterSpacing: 4,
          textTransform: 'uppercase',
        }}
      >
        {text}
      </div>
    );
  }

  if (el.type === 'table') {
    const rows = el.rows ?? [];
    return (
      <div style={{ ...baseStyle, display: 'flex', flexDirection: 'column' }}>
        {el.content && (
          <div style={{ fontWeight: 700, fontSize: s.fontSize, marginBottom: 6, textAlign: s.align }}>{text}</div>
        )}
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: s.fontSize }}>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} style={{ borderBottom: '1px solid #e2e8f0' }}>
                <td style={{ padding: '4px 2px', textAlign: 'left' }}>{r.label}</td>
                <td style={{ padding: '4px 2px', textAlign: 'right', fontWeight: 600 }}>
                  {preview ? renderBindings(r.value, ctx) : r.value}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (el.type === 'box' || el.type === 'card') {
    return <div style={baseStyle}>{text}</div>;
  }

  return (
    <div
      style={{
        ...baseStyle,
        display: 'flex',
        alignItems: 'center',
        justifyContent: s.align === 'center' ? 'center' : s.align === 'right' ? 'flex-end' : 'flex-start',
        whiteSpace: 'pre-wrap',
        textTransform: el.type === 'label' ? 'uppercase' : 'none',
        letterSpacing: el.type === 'label' ? 0.6 : undefined,
      }}
    >
      {text}
    </div>
  );
}
