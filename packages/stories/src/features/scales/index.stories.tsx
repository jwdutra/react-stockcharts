import type { Meta, StoryObj } from "@storybook/react";
import { scaleLog, scaleUtc } from "d3-scale";
import { Daily } from "./Scales";
import { TimezoneExample } from "./TimezoneExample";
import { TimezoneDiscontinuousExample } from "./TimezoneDiscontinuousExample";

const meta: Meta<typeof Daily> = {
    title: "Features/Scales",
    component: Daily,
};

export default meta;
type Story = StoryObj<typeof Daily>;

export const continuousScale: Story = {
    render: () => <Daily />,
};

export const utcScale: Story = {
    render: () => <Daily xScale={scaleUtc()} />,
};

export const logScale: Story = {
    render: () => <Daily yScale={scaleLog()} />,
};

type TimezoneStory = StoryObj<typeof TimezoneExample>;

export const timezoneUTC: TimezoneStory = {
    name: "Timezone UTC (scaleTime)",
    render: () => <TimezoneExample timezone="UTC" />,
};

export const timezoneNewYork: TimezoneStory = {
    name: "Timezone New York (scaleTime)",
    render: () => <TimezoneExample timezone="America/New_York" />,
};

export const timezoneTokyo: TimezoneStory = {
    name: "Timezone Tokyo (scaleTime)",
    render: () => <TimezoneExample timezone="Asia/Tokyo" />,
};

export const timezoneLondon: TimezoneStory = {
    name: "Timezone London (scaleTime)",
    render: () => <TimezoneExample timezone="Europe/London" />,
};

type TimezoneDiscontinuousStory = StoryObj<typeof TimezoneDiscontinuousExample>;

export const timezoneDiscontinuousUTC: TimezoneDiscontinuousStory = {
    name: "Timezone UTC (Discontinuous)",
    render: () => <TimezoneDiscontinuousExample timezone="UTC" />,
};

export const timezoneDiscontinuousNewYork: TimezoneDiscontinuousStory = {
    name: "Timezone New York (Discontinuous)",
    render: () => <TimezoneDiscontinuousExample timezone="America/New_York" />,
};

export const timezoneDiscontinuousTokyo: TimezoneDiscontinuousStory = {
    name: "Timezone Tokyo (Discontinuous)",
    render: () => <TimezoneDiscontinuousExample timezone="Asia/Tokyo" />,
};

export const timezoneDiscontinuousLondon: TimezoneDiscontinuousStory = {
    name: "Timezone London (Discontinuous)",
    render: () => <TimezoneDiscontinuousExample timezone="Europe/London" />,
};
