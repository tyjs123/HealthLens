'use client';

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import type { NormalItem } from '@/types';

interface NormalListProps {
  items: NormalItem[];
}

export function NormalList({ items }: NormalListProps) {
  if (items.length === 0) return null;
  return (
    <Accordion className="w-full rounded-xl border border-gray-100 bg-white">
      <AccordionItem value="normal" className="border-0">
        <AccordionTrigger className="px-4 py-3 text-sm font-medium text-gray-700 hover:no-underline hover:bg-gray-50/50">
          查看全部正常指标（{items.length} 项）
        </AccordionTrigger>
        <AccordionContent className="px-4 pb-4">
          <div className="overflow-hidden rounded-lg border border-gray-100">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500">
                <tr>
                  <th className="px-4 py-2.5 text-left font-medium">指标名称</th>
                  <th className="px-4 py-2.5 text-center font-medium">检测结果</th>
                  <th className="px-4 py-2.5 text-right font-medium">参考范围</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {items.map((item) => (
                  <tr key={item.name} className="hover:bg-gray-50/50">
                    <td className="px-4 py-2.5 text-gray-700">{item.name}</td>
                    <td className="px-4 py-2.5 text-center font-medium text-gray-900">
                      {item.value} <span className="text-xs font-normal text-gray-400">{item.unit}</span>
                    </td>
                    <td className="px-4 py-2.5 text-right text-gray-500">{item.ref}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
