import React, { useState } from "react";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";
import { useReducedMotion } from "motion/react";
import { money } from "../api";
const colors = [
  "#d2f28b",
  "#79b8f3",
  "#c4a4df",
  "#e2b879",
  "#71b9a0",
  "#acb8ae",
];
export default function SpendingChart({ categories, total }) {
  const [selected, setSelected] = useState(null),
    [hover, setHover] = useState(null),
    reduced = useReducedMotion();
  const active = categories.find((c) => c.name === (hover || selected)),
    data = categories.map((c) => ({ ...c, value: Number(c.amount) }));
  if (!categories.length || Number(total) <= 0)
    return (
      <div className="empty">
        <h3>No paid spending to chart yet</h3>
        <p>Add an active paid plan to see your category breakdown.</p>
      </div>
    );
  return (
    <div className="spending-chart">
      <div
        className="donut-wrap recharts-donut"
        role="img"
        aria-label={`Monthly spending ${money(total)}. Use the category buttons for exact amounts.`}
      >
        <ResponsiveContainer width="100%" height={220} minWidth={0}>
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius="66%"
              outerRadius="88%"
              startAngle={90}
              endAngle={-270}
              paddingAngle={2}
              stroke="none"
              isAnimationActive={!reduced}
              animationDuration={250}
              animationBegin={0}
              onMouseEnter={(_, i) => setHover(categories[i]?.name)}
              onMouseLeave={() => setHover(null)}
              onClick={(_, i) =>
                setSelected(
                  categories[i]?.name === selected ? null : categories[i]?.name,
                )
              }
            >
              {data.map((c, i) => (
                <Cell
                  key={c.name}
                  fill={colors[i % colors.length]}
                  fillOpacity={selected && selected !== c.name ? 0.25 : 1}
                />
              ))}
            </Pie>
            <Tooltip
              content={({ active, payload }) =>
                active && payload?.length ? (
                  <div className="chart-tooltip">
                    <strong>{payload[0].name}</strong>
                    <span>{money(payload[0].value)} / month</span>
                  </div>
                ) : null
              }
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="donut-center" aria-live="polite">
          <small>{active?.name || "MONTHLY TOTAL"}</small>
          <strong>{money(active?.amount ?? total)}</strong>
          <span>
            {active
              ? `${Math.round((Number(active.amount) / Number(total)) * 100)}% of paid spending`
              : "Active plans only"}
          </span>
        </div>
      </div>
      <div className="chart-legend">
        <button
          className={"legend-reset " + (!selected ? "chosen" : "")}
          onClick={() => {
            setSelected(null);
            setHover(null);
          }}
          aria-pressed={!selected}
        >
          All categories <span>{categories.length}</span>
        </button>
        {categories.map((c, i) => (
          <button
            key={c.name}
            className={"legend-item " + (selected === c.name ? "chosen" : "")}
            aria-pressed={selected === c.name}
            onClick={() => setSelected(selected === c.name ? null : c.name)}
            onFocus={() => setHover(c.name)}
            onBlur={() => setHover(null)}
            onMouseEnter={() => setHover(c.name)}
            onMouseLeave={() => setHover(null)}
          >
            <i style={{ background: colors[i % colors.length] }} />
            <span>{c.name}</span>
            <strong>{money(c.amount)}</strong>
          </button>
        ))}
      </div>
    </div>
  );
}
