import React from "react";

type Props = {
  sampleType: "small" | "large";
  setSampleType: (value: "small" | "large") => void;
};

export function Topbar({ sampleType, setSampleType }: Props) {
  return (
    <select
      value={sampleType}
      onChange={(e) => setSampleType(e.target.value as any)}
    >
      <option value="small">Small sample</option>
      <option value="large">Large sample</option>
    </select>
  );
}