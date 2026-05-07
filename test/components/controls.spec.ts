import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import NumericField from "@/components/controls/NumericField.vue";
import SegmentedControl from "@/components/controls/SegmentedControl.vue";

describe("NumericField", () => {
  it("emits the raw input value as a string", async () => {
    const wrapper = mount(NumericField, {
      props: {
        label: "Voltage",
        modelValue: 2.7,
        step: 0.1,
      },
    });

    await wrapper.get("input").setValue("3.1");

    expect(wrapper.emitted("input-value")).toEqual([["3.1"]]);
  });
});

describe("SegmentedControl", () => {
  it("emits model and change events for the chosen option", async () => {
    const wrapper = mount(SegmentedControl, {
      props: {
        label: "Mode",
        modelValue: "relative",
        options: [
          { label: "Relative", value: "relative" },
          { label: "Photon", value: "photon" },
        ],
      },
    });

    await wrapper.findAll("button")[1].trigger("click");

    expect(wrapper.emitted("update:modelValue")).toEqual([["photon"]]);
    expect(wrapper.emitted("change")).toEqual([["photon"]]);
  });
});
