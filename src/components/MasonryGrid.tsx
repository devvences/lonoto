import {
  Fragment,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { Box } from '@mui/material';

interface MasonryGridProps<T> {
  items: T[];
  getKey: (item: T) => string;
  renderItem: (item: T) => ReactNode;
  /** Narrowest a column may get before the count drops. */
  minColumnWidth?: number;
  gap?: number;
  maxColumns?: number;
}

/**
 * Flex-column masonry. CSS `column-count` can leave a trailing empty column
 * when one card is taller than the balanced column height, so the cards are
 * distributed across explicit columns instead. Every column shares the full
 * width, which keeps the right edge of the board filled.
 */
export default function MasonryGrid<T>({
  items,
  getKey,
  renderItem,
  minColumnWidth = 300,
  gap = 18,
  maxColumns = 8,
}: MasonryGridProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);

  useLayoutEffect(() => {
    const element = containerRef.current;
    if (!element) return;
    const measure = () => {
      const next = element.clientWidth;
      setWidth((current) => (current === next ? current : next));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const fittingColumns =
    width > 0 ? Math.floor((width + gap) / (minColumnWidth + gap)) : 1;
  const columnCount = Math.max(
    1,
    Math.min(fittingColumns, maxColumns, Math.max(items.length, 1)),
  );

  const columns: T[][] = Array.from({ length: columnCount }, () => []);
  items.forEach((item, index) => {
    columns[index % columnCount].push(item);
  });

  return (
    <Box
      ref={containerRef}
      className="masonry"
      sx={{ display: 'flex', alignItems: 'flex-start', gap: `${gap}px` }}
    >
      {width === 0
        ? null
        : columns.map((column, columnIndex) => (
            <Box
              key={columnIndex}
              className="masonry-column"
              sx={{
                flex: '1 1 0',
                minWidth: 0,
                display: 'flex',
                flexDirection: 'column',
                gap: `${gap}px`,
              }}
            >
              {column.map((item) => (
                <Fragment key={getKey(item)}>{renderItem(item)}</Fragment>
              ))}
            </Box>
          ))}
    </Box>
  );
}
