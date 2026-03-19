import React from "react";
import { Card } from "../common/Card";
import { SectionTitle } from "../common/SectionTitle";
import { leftPanelStyle } from "./layout.styles";

export function LeftPanel() {
  return (
    <aside style={leftPanelStyle}>
      <SectionTitle>Palette</SectionTitle>
      <Card>Send Push</Card>
      <Card>Wait Timer</Card>
      <Card>Condition Branch</Card>
      <Card>Coupon Action</Card>
      <Card>Container Zone</Card>
    </aside>
  );
}