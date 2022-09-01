const commonlocators = require("../../../../../../locators/commonlocators.json");

describe("Table widget - Select column type functionality", () => {
  before(() => {
    cy.dragAndDropToCanvas("tablewidgetv2", { x: 150, y: 300 });
  });

  it("1. should check that select column is available in the column dropdown options", () => {
    cy.openPropertyPane("tablewidgetv2");
    cy.editColumn("step");

    cy.get(commonlocators.changeColType)
      .last()
      .click();
    cy.get(".t--dropdown-option")
      .children()
      .contains("Select")
      .click();
    cy.wait("@updateLayout");
  });

  it("2. should check that edtiable option is present", () => {
    cy.get(".t--property-control-editable").should("exist");
    cy.get(".t--property-pane-section-collapse-events").should("not.exist");
    cy.get(".t--property-control-editable .bp3-switch span").click();
    cy.get(".t--property-pane-section-collapse-events").should("exist");
  });

  it("3. should check that options given in the property pane is appearing on the table", () => {
    cy.get(".t--property-control-options").should("exist");
    cy.updateCodeInput(
      ".t--property-control-options",
      `
      {{[
        {
          label: "#1",
          value: "#1"
        },
        {
          label: "#2",
          value: "#2"
        },
        {
          label: "#3",
          value: "#3"
        }
      ]}}
    `,
    );
    cy.editTableSelectCell(0, 0);

    [
      {
        label: "#1",
        value: "#1",
      },
      {
        label: "#2",
        value: "#2",
      },
      {
        label: "#3",
        value: "#3",
      },
    ].forEach((item) => {
      cy.get(".menu-item-text")
        .contains(item.value)
        .should("exist");
    });

    cy.get(".menu-item-active.has-focus").should("contain", "#1");
  });

  it("4. should check that placeholder property is working", () => {
    cy.updateCodeInput(
      ".t--property-control-options",
      `
      {{[
        {
          label: "test",
          value: "test"
        },
      ]}}
    `,
    );
    cy.editTableSelectCell(0, 0);
    cy.get(
      `[data-colindex="0"][data-rowindex="0"] .select-button .bp3-button-text`,
    ).should("contain", "-- Select --");

    cy.updateCodeInput(".t--property-control-placeholder", "choose an option");

    cy.editTableSelectCell(0, 0);
    cy.get(
      `[data-colindex="0"][data-rowindex="0"] .select-button .bp3-button-text`,
    ).should("contain", "choose an option".toUpperCase());

    cy.updateCodeInput(".t--property-control-placeholder", "choose an item");

    cy.editTableSelectCell(0, 0);
    cy.get(
      `[data-colindex="0"][data-rowindex="0"] .select-button .bp3-button-text`,
    ).should("contain", "choose an item".toUpperCase());
  });

  it("5. should check that filterable property is working", () => {
    cy.updateCodeInput(
      ".t--property-control-options",
      `
      {{[
        {
          label: "#1",
          value: "#1"
        },
        {
          label: "#2",
          value: "#2"
        },
        {
          label: "#3",
          value: "#3"
        }
      ]}}
    `,
    );
    cy.get(".t--property-control-filterable .bp3-switch span").click();
    cy.editTableSelectCell(0, 0);
    cy.get(".select-popover-wrapper .bp3-input-group input").should("exist");
    cy.get(".select-popover-wrapper .bp3-input-group input").type("1", {
      force: true,
    });

    cy.get(".menu-item-link").should("have.length", 1);
    cy.get(".menu-item-link").should("contain", "#1");

    cy.get(".select-popover-wrapper .bp3-input-group input")
      .clear()
      .type("3", { force: true });

    cy.get(".menu-item-link").should("have.length", 1);
    cy.get(".menu-item-link").should("contain", "#3");

    cy.get(".select-popover-wrapper .bp3-input-group input").clear();

    cy.get(".menu-item-link").should("have.length", 3);
    cy.get(".t--canvas-artboard").click({ force: true });
  });

  // it("6. should check that reset filter on filter close property is working", () => {
  //   cy.dragAndDropToCanvas("textwidget", { x: 150, y: 100 });
  //   cy.openPropertyPane("tablewidgetv2");
  //   cy.editColumn("step");
  //   cy.get(".t--property-control-filterable .bp3-switch span").click();
  //   cy.editTableSelectCell(0, 0);
  //   cy.get(".select-popover-wrapper .bp3-input-group input").type("1", {force: true});
  //   cy.get(".bp3-ui-text").click();
  //   cy.editTableSelectCell(0, 0);
  //   cy.get(".select-popover-wrapper .bp3-input-group input").should("have.value", "1");
  //   cy.get(".select-popover-wrapper .bp3-input-group input").clear().type("2", {force: true});
  //   cy.get(".bp3-ui-text").click();
  //   cy.editTableSelectCell(0, 0);
  //   cy.get(".select-popover-wrapper .bp3-input-group input").should("have.value", "2");
  // });

  it("7. should check that on option select is working", () => {
    cy.openPropertyPane("tablewidgetv2");
    cy.get(".t--property-control-onoptionchange .t--js-toggle").click();
    cy.updateCodeInput(
      ".t--property-control-onoptionchange",
      `
      {{showAlert(JSON.stringify(currentRow.step))}}
    `,
    );
    cy.editTableSelectCell(0, 0);
    cy.get(".menu-item-link")
      .contains("#3")
      .click();
    cy.get(".menu-virtual-list").should("not.exist");
    cy.readTableV2data(0, 0).then((val) => {
      expect(val).to.equal("#3");
    });
  });

  // it("8. should check that server side filering is working", () => {

  // });
});
