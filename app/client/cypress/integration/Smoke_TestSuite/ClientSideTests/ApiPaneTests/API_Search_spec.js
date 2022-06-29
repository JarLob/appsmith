const testdata = require("../../../../fixtures/testdata.json");
import ApiEditor from "../../../../locators/ApiEditor";

const testUrl = "http://hp-api.herokuapp.com/api/characters/students";

describe("API Panel Test Functionality ", function() {
  it("Test Search API fetaure", function() {
    cy.log("Login Successful");
    cy.NavigateToAPI_Panel();
    cy.log("Navigation to API Panel screen successful");
    cy.CreateAPI("FirstAPI");
    cy.RunAPI();
    cy.log("Creation of FirstAPI Action successful");
    cy.NavigateToAPI_Panel();
    cy.CreateAPI("SecondAPI");
    cy.RunAPI();
    cy.CheckAndUnfoldEntityItem("QUERIES/JS");
    cy.log("Creation of SecondAPI Action successful");
    cy.get(".t--entity-name").contains("FirstAPI");
    cy.get(".t--entity-name").contains("SecondAPI");
    cy.DeleteAPIFromSideBar();
    cy.DeleteAPIFromSideBar();
  });

  it("if suggested widgets section alwas appears for all 3 modes", function() {
    cy.log("Login Successful");
    cy.createAndFillApi(testUrl, "");
    cy.RunAPI();
    cy.get(ApiEditor.jsonResponseTab).click();
    cy.checkIfApiPaneIsVisible();
    cy.get(ApiEditor.rawResponseTab).click();
    cy.checkIfApiPaneIsVisible();
    cy.get(ApiEditor.tableResponseTab).click();
    cy.checkIfApiPaneIsVisible();
  });
});