import { mount } from "@vue/test-utils";
import { afterEach, describe, expect, it } from "vitest";
import { nextTick } from "vue";
import PlannerModalFrame from "@/components/modals/PlannerModalFrame.vue";

afterEach(() => {
  document.body.innerHTML = "";
});

describe("PlannerModalFrame", () => {
  it("focuses the first actionable control and emits close on Escape", async () => {
    const wrapper = mount(PlannerModalFrame, {
      attachTo: document.body,
      props: {
        open: true,
        title: "Board Drive Config",
      },
      slots: {
        default: '<button type="button">Save</button>',
      },
    });
    await nextTick();
    await nextTick();

    expect(document.activeElement?.textContent).toBe("Save");

    await wrapper.get(".modal-backdrop").trigger("keydown", { key: "Escape" });

    expect(wrapper.emitted("close")).toEqual([[]]);
  });

  it("restores focus to the previously focused element when closed", async () => {
    const opener = document.createElement("button");
    opener.textContent = "Open";
    document.body.append(opener);
    opener.focus();

    const wrapper = mount(PlannerModalFrame, {
      attachTo: document.body,
      props: {
        open: true,
        title: "Emitter Config",
      },
      slots: {
        default: '<button type="button">Save</button>',
      },
    });
    await nextTick();

    await wrapper.setProps({ open: false });
    await nextTick();

    expect(document.activeElement).toBe(opener);
  });
});
