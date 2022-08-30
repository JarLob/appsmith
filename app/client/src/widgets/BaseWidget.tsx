/**
 * Widget are responsible for accepting the abstraction layer inputs, interpretting them into rederable props and
 * spawing components based on those props
 * Widgets are also responsible for dispatching actions and updating the state tree
 */
import {
  CONTAINER_GRID_PADDING,
  CSSUnit,
  CSSUnits,
  GridDefaults,
  PositionType,
  PositionTypes,
  RenderMode,
  RenderModes,
  WidgetHeightLimits,
  WidgetType,
  WIDGET_PADDING,
} from "constants/WidgetConstants";
import React, { Component, ReactNode } from "react";
import { debounce, get, memoize } from "lodash";
import DraggableComponent from "components/editorComponents/DraggableComponent";
import SnipeableComponent from "components/editorComponents/SnipeableComponent";
import ResizableComponent from "components/editorComponents/ResizableComponent";
import { ExecuteTriggerPayload } from "constants/AppsmithActionConstants/ActionConstants";
import PositionedContainer from "components/designSystems/appsmith/PositionedContainer";
import WidgetNameComponent from "components/editorComponents/WidgetNameComponent";
import shallowequal from "shallowequal";
import { EditorContext } from "components/editorComponents/EditorContextProvider";
import ErrorBoundary from "components/editorComponents/ErrorBoundry";
import { DerivedPropertiesMap } from "utils/WidgetFactory";
import {
  DataTreeEvaluationProps,
  EVAL_ERROR_PATH,
  EvaluationError,
  PropertyEvaluationErrorType,
  WidgetDynamicPathListProps,
} from "utils/DynamicBindingUtils";
import { PropertyPaneConfig } from "constants/PropertyControlConstants";
import { BatchPropertyUpdatePayload } from "actions/controlActions";
import OverlayCommentsWrapper from "comments/inlineComments/OverlayCommentsWrapper";
import PreventInteractionsOverlay from "components/editorComponents/PreventInteractionsOverlay";
import AppsmithConsole from "utils/AppsmithConsole";
import { ENTITY_TYPE } from "entities/AppsmithConsole";
import PreviewModeComponent from "components/editorComponents/PreviewModeComponent";
import { DynamicHeight } from "utils/WidgetFeatures";
import { isDynamicHeightEnabledForWidget } from "./WidgetUtils";
import DynamicHeightOverlay from "components/editorComponents/DynamicHeightOverlay";
import log from "loglevel";

/***
 * BaseWidget
 *
 * The abstract class which is extended/implemented by all widgets.
 * Widgets must adhere to the abstractions provided by BaseWidget.
 *
 * Do not:
 * 1) Use the context directly in the widgets
 * 2) Update or access the dsl in the widgets
 * 3) Call actions in widgets or connect the widgets to the entity reducers
 *
 */

abstract class BaseWidget<
  T extends WidgetProps,
  K extends WidgetState
> extends Component<T, K> {
  static contextType = EditorContext;
  contentRef = React.createRef<HTMLDivElement>();

  static getPropertyPaneConfig(): PropertyPaneConfig[] {
    return [];
  }

  static getDerivedPropertiesMap(): DerivedPropertiesMap {
    return {};
  }

  static getDefaultPropertiesMap(): Record<string, any> {
    return {};
  }
  // TODO Find a way to enforce this, (dont let it be set)
  static getMetaPropertiesMap(): Record<string, any> {
    return {};
  }

  /**
   *  Widget abstraction to register the widget type
   *  ```javascript
   *   getWidgetType() {
   *     return "MY_AWESOME_WIDGET",
   *   }
   *  ```
   */

  /**
   *  Widgets can execute actions using this `executeAction` method.
   *  Triggers may be specific to the widget
   */
  executeAction(actionPayload: ExecuteTriggerPayload): void {
    const { executeAction } = this.context;
    executeAction &&
      executeAction({
        ...actionPayload,
        source: {
          id: this.props.widgetId,
          name: this.props.widgetName,
        },
      });

    actionPayload.triggerPropertyName &&
      AppsmithConsole.info({
        text: `${actionPayload.triggerPropertyName} triggered`,
        source: {
          type: ENTITY_TYPE.WIDGET,
          id: this.props.widgetId,
          name: this.props.widgetName,
        },
      });
  }

  disableDrag(disable: boolean) {
    const { disableDrag } = this.context;
    disableDrag && disable !== undefined && disableDrag(disable);
  }

  updateWidget(
    operationName: string,
    widgetId: string,
    widgetProperties: any,
  ): void {
    const { updateWidget } = this.context;
    updateWidget && updateWidget(operationName, widgetId, widgetProperties);
  }

  deleteWidgetProperty(propertyPaths: string[]): void {
    const { deleteWidgetProperty } = this.context;
    const { widgetId } = this.props;
    if (deleteWidgetProperty && widgetId) {
      deleteWidgetProperty(widgetId, propertyPaths);
    }
  }

  batchUpdateWidgetProperty(
    updates: BatchPropertyUpdatePayload,
    shouldReplay = true,
  ): void {
    const { batchUpdateWidgetProperty } = this.context;
    const { widgetId } = this.props;
    if (batchUpdateWidgetProperty && widgetId) {
      batchUpdateWidgetProperty(widgetId, updates, shouldReplay);
    }
  }

  updateWidgetProperty(propertyName: string, propertyValue: any): void {
    this.batchUpdateWidgetProperty({
      modify: { [propertyName]: propertyValue },
    });
  }

  resetChildrenMetaProperty(widgetId: string) {
    const { resetChildrenMetaProperty } = this.context;
    if (resetChildrenMetaProperty) resetChildrenMetaProperty(widgetId);
  }

  /*
    This method calls the action to update widget height
    We're not using `updateWidgetProperty`, because, the workflow differs
    We will be computing properties of all widgets which are effected by
    this change.
    @param height number: Height of the widget's contents in pixels 
    @return void

    TODO (abhinav): Make sure that this isn't called for scenarios which do not require it
    This is for performance. We don't want unnecessary code to run
  */
  updateDynamicHeight(height: number): void {
    const shouldUpdate = this.shouldUpdateDynamicHeight(height);
    const { updateWidgetDynamicHeight } = this.context;
    if (updateWidgetDynamicHeight) {
      const { widgetId } = this.props;
      log.debug("updateDynamicHeight", height, shouldUpdate);
      shouldUpdate &&
        updateWidgetDynamicHeight(widgetId, height + WIDGET_PADDING * 2);
    }
  }

  // TODO: ADD_TEST(abhinav): Write a unit test
  shouldUpdateDynamicHeight(expectedHeight: number): boolean {
    // The current height in pixels of the widget
    const currentHeightInRows = this.props.bottomRow - this.props.topRow;
    const expectedHeightInRows = Math.ceil(
      expectedHeight / GridDefaults.DEFAULT_GRID_ROW_HEIGHT,
    );

    log.debug(
      "Dynamic height: Checking if we should update:",
      { props: this.props },
      { currentHeightInRows },
      { expectedHeightInRows },
      { diff: Math.abs(currentHeightInRows - expectedHeightInRows) },
    );

    // If the diff is of less than 2 rows, do nothing. If it is actually 2 rows,
    // then we need to compute.
    // if (Math.abs(currentHeightInRows - expectedHeightInRows) < 2) return false;
    // Does this widget have dynamic height enabled
    const isDynamicHeightEnabled = isDynamicHeightEnabledForWidget(this.props);

    // Run the following pieces of code only if dynamic height is enabled
    if (!isDynamicHeightEnabled) return false;

    const maxDynamicHeightInRows =
      DynamicHeight.AUTO_HEIGHT_WITH_LIMITS && this.props.maxDynamicHeight
        ? this.props.maxDynamicHeight
        : WidgetHeightLimits.MAX_HEIGHT_IN_ROWS;

    const minDynamicHeightInRows =
      DynamicHeight.AUTO_HEIGHT_WITH_LIMITS && this.props.minDynamicHeight
        ? this.props.minDynamicHeight
        : WidgetHeightLimits.MIN_HEIGHT_IN_ROWS;

    // If current height is less than the expected height
    // We're trying to see if we can increase the height
    if (currentHeightInRows < expectedHeightInRows) {
      // If we're not already at the max height, we can increase height
      if (maxDynamicHeightInRows >= currentHeightInRows) {
        return true;
      }
    }

    // If current height is greater than expected height
    // We're trying to see if we can reduce the height
    if (currentHeightInRows > expectedHeightInRows) {
      // If our attempt to reduce does not go below the min possible height
      // We can safely reduce the height
      if (minDynamicHeightInRows <= expectedHeightInRows) {
        return true;
      }

      // If minDynamicHeightInRows is larger than expectedHeightInRows
      if (minDynamicHeightInRows > expectedHeightInRows) {
        return true;
      }
    }

    // If current height is less than the minDynamicHeightInRows
    // We're trying to see if we can increase the height
    if (currentHeightInRows < minDynamicHeightInRows) {
      return true;
    }

    // If current height is more than the maxDynamicHeightInRows
    // We're trying to see if we can decrease the height
    if (currentHeightInRows > maxDynamicHeightInRows) {
      return true;
    }

    // Since the conditions to change height already return true
    // If we reach this point, we don't have to change height
    return false;
  }

  /* eslint-disable @typescript-eslint/no-empty-function */
  /* eslint-disable @typescript-eslint/no-unused-vars */
  componentDidUpdate(prevProps: T) {
    requestAnimationFrame(() => {
      const expectedHeight = this.contentRef.current?.scrollHeight;
      if (expectedHeight !== undefined)
        this.updateDynamicHeight(expectedHeight);
    });
  }

  componentDidMount(): void {}
  /* eslint-enable @typescript-eslint/no-empty-function */

  getComponentDimensions = () => {
    return this.calculateWidgetBounds(
      this.props.rightColumn,
      this.props.leftColumn,
      this.props.topRow,
      this.props.bottomRow,
      this.props.parentColumnSpace,
      this.props.parentRowSpace,
    );
  };

  calculateWidgetBounds(
    rightColumn: number,
    leftColumn: number,
    topRow: number,
    bottomRow: number,
    parentColumnSpace: number,
    parentRowSpace: number,
  ): {
    componentWidth: number;
    componentHeight: number;
  } {
    return {
      componentWidth: (rightColumn - leftColumn) * parentColumnSpace,
      componentHeight: (bottomRow - topRow) * parentRowSpace,
    };
  }

  getLabelWidth = () => {
    return (Number(this.props.labelWidth) || 0) * this.props.parentColumnSpace;
  };

  getErrorCount = memoize((evalErrors: Record<string, EvaluationError[]>) => {
    return Object.values(evalErrors).reduce(
      (prev, curr) =>
        curr.filter(
          (error) => error.errorType !== PropertyEvaluationErrorType.LINT,
        ).length + prev,
      0,
    );
  }, JSON.stringify);

  render() {
    return this.getWidgetView();
  }

  /**
   * this function is responsive for making the widget resizable.
   * A widget can be made by non-resizable by passing resizeDisabled prop.
   *
   * @param content
   */
  makeResizable(content: ReactNode) {
    return (
      <ResizableComponent
        {...this.props}
        paddingOffset={PositionedContainer.padding}
      >
        {content}
      </ResizableComponent>
    );
  }

  /**
   * this functions wraps the widget in a component that shows a setting control at the top right
   * which gets shown on hover. A widget can enable/disable this by setting `disablePropertyPane` prop
   *
   * @param content
   * @param showControls
   */
  showWidgetName(content: ReactNode, showControls = false) {
    return (
      <>
        {!this.props.disablePropertyPane && (
          <WidgetNameComponent
            errorCount={this.getErrorCount(
              get(this.props, EVAL_ERROR_PATH, {}),
            )}
            parentId={this.props.parentId}
            showControls={showControls}
            topRow={this.props.detachFromLayout ? 4 : this.props.topRow}
            type={this.props.type}
            widgetId={this.props.widgetId}
            widgetName={this.props.widgetName}
          />
        )}
        {content}
      </>
    );
  }

  /**
   * wraps the widget in a draggable component.
   * Note: widget drag can be disabled by setting `dragDisabled` prop to true
   *
   * @param content
   */
  makeDraggable(content: ReactNode) {
    return <DraggableComponent {...this.props}>{content}</DraggableComponent>;
  }
  /**
   * wraps the widget in a draggable component.
   * Note: widget drag can be disabled by setting `dragDisabled` prop to true
   *
   * @param content
   */
  makeSnipeable(content: ReactNode) {
    return <SnipeableComponent {...this.props}>{content}</SnipeableComponent>;
  }

  makePositioned(content: ReactNode) {
    const style = this.getPositionStyle();
    return (
      <PositionedContainer
        focused={this.props.focused}
        parentId={this.props.parentId}
        resizeDisabled={this.props.resizeDisabled}
        selected={this.props.selected}
        style={style}
        widgetId={this.props.widgetId}
        widgetType={this.props.type}
      >
        {content}
      </PositionedContainer>
    );
  }

  addErrorBoundary(content: ReactNode) {
    return <ErrorBoundary>{content}</ErrorBoundary>;
  }

  /**
   * These comments are rendered using position: absolute over the widget borders,
   * they are not aware of the component structure.
   * For additional component specific contexts, for eg.
   * a comment bound to the scroll position or a specific section
   * we would pass comments as props to the components
   */
  addOverlayComments(content: ReactNode) {
    return (
      <OverlayCommentsWrapper
        refId={this.props.widgetId}
        widgetType={this.props.type}
      >
        {content}
      </OverlayCommentsWrapper>
    );
  }

  addPreventInteractionOverlay(content: ReactNode) {
    return (
      <PreventInteractionsOverlay widgetType={this.props.type}>
        {content}
      </PreventInteractionsOverlay>
    );
  }

  addPreviewModeWidget(content: ReactNode): React.ReactElement {
    return (
      <PreviewModeComponent isVisible={this.props.isVisible}>
        {content}
      </PreviewModeComponent>
    );
  }

  addDynamicHeightOverlay(content: ReactNode) {
    const onMaxHeightSet = (height: number) => {
      console.log("addDynamicHeightOverlay onMaxHeightSet", height);
      this.updateWidgetProperty("maxDynamicHeight", Math.floor(height / 10));
    };

    const onMinHeightSet = (height: number) => {
      console.log("addDynamicHeightOverlay onMinHeightSet", height);
      this.updateWidgetProperty("minDynamicHeight", Math.floor(height / 10));
    };

    const onBatchUpdate = (height: number) => {
      console.log("addDynamicHeightOverlay onBatchUpdate", height);
      this.batchUpdateWidgetProperty({
        modify: {
          maxDynamicHeight: Math.floor(height / 10),
          minDynamicHeight: Math.floor(height / 10),
        },
      });
    };

    return (
      <div>
        <DynamicHeightOverlay
          {...this.props}
          batchUpdate={onBatchUpdate}
          maxDynamicHeight={this.props.maxDynamicHeight}
          minDynamicHeight={this.props.minDynamicHeight}
          onMaxHeightSet={onMaxHeightSet}
          onMinHeightSet={onMinHeightSet}
          style={this.getPositionStyle()}
        />
        {content}
      </div>
    );
  }

  private getWidgetView(): ReactNode {
    let content: ReactNode;
    switch (this.props.renderMode) {
      case RenderModes.CANVAS:
        content = this.getCanvasView();
        content = this.addPreviewModeWidget(content);

        content = this.addPreventInteractionOverlay(content);
        content = this.addOverlayComments(content);

        if (!this.props.detachFromLayout) {
          if (!this.props.resizeDisabled) content = this.makeResizable(content);
          content = this.showWidgetName(content);
          content = this.makeDraggable(content);
          content = this.makeSnipeable(content);
          // NOTE: In sniping mode we are not blocking onClick events from PositionWrapper.
          content = this.makePositioned(content);

          if (
            this.props.dynamicHeight === DynamicHeight.AUTO_HEIGHT_WITH_LIMITS
          ) {
            log.debug(
              "AUTO_HEIGHT_WITH_LIMITS",
              this.props.maxDynamicHeight,
              this.props.minDynamicHeight,
            );
            content = this.addDynamicHeightOverlay(content);
          }
        }

        return content;

      // return this.getCanvasView();
      case RenderModes.PAGE:
        content = this.getPageView();
        if (this.props.isVisible) {
          content = this.addPreventInteractionOverlay(content);
          content = this.addOverlayComments(content);
          content = this.addErrorBoundary(content);
          if (!this.props.detachFromLayout) {
            content = this.makePositioned(content);
          }
          return content;
        }
        return null;
      default:
        throw Error("RenderMode not defined");
    }
  }

  abstract getPageView(): ReactNode;

  getCanvasView(): ReactNode {
    const content = this.getPageView();
    return this.addErrorBoundary(content);
  }

  // TODO(abhinav): Maybe make this a pure component to bailout from updating altogether.
  // This would involve making all widgets which have "states" to not have states,
  // as they're extending this one.
  shouldComponentUpdate(nextProps: WidgetProps, nextState: WidgetState) {
    return (
      !shallowequal(nextProps, this.props) ||
      !shallowequal(nextState, this.state)
    );
  }

  /**
   * generates styles that positions the widget
   */
  private getPositionStyle(): BaseStyle {
    const { componentHeight, componentWidth } = this.getComponentDimensions();

    return {
      positionType: PositionTypes.ABSOLUTE,
      componentHeight,
      componentWidth,
      yPosition:
        this.props.topRow * this.props.parentRowSpace +
        (this.props.noContainerOffset ? 0 : CONTAINER_GRID_PADDING),
      xPosition:
        this.props.leftColumn * this.props.parentColumnSpace +
        (this.props.noContainerOffset ? 0 : CONTAINER_GRID_PADDING),
      xPositionUnit: CSSUnits.PIXEL,
      yPositionUnit: CSSUnits.PIXEL,
    };
  }

  // TODO(abhinav): These defaultProps seem unneccessary. Check it out.
  static defaultProps: Partial<WidgetProps> | undefined = {
    parentRowSpace: 1,
    parentColumnSpace: 1,
    topRow: 0,
    leftColumn: 0,
    isLoading: false,
    renderMode: RenderModes.CANVAS,
    dragDisabled: false,
    dropDisabled: false,
    isDeletable: true,
    resizeDisabled: false,
    disablePropertyPane: false,
  };
}

export interface BaseStyle {
  componentHeight: number;
  componentWidth: number;
  positionType: PositionType;
  xPosition: number;
  yPosition: number;
  xPositionUnit: CSSUnit;
  yPositionUnit: CSSUnit;
  heightUnit?: CSSUnit;
  widthUnit?: CSSUnit;
}

export type WidgetState = Record<string, unknown>;

export interface WidgetBuilder<T extends WidgetProps, S extends WidgetState> {
  buildWidget(widgetProps: T): JSX.Element;
}

export interface WidgetBaseProps {
  widgetId: string;
  type: WidgetType;
  widgetName: string;
  parentId?: string;
  renderMode: RenderMode;
  version: number;
}

export type WidgetRowCols = {
  leftColumn: number;
  rightColumn: number;
  topRow: number;
  bottomRow: number;
  minHeight?: number; // Required to reduce the size of CanvasWidgets.
};

export interface WidgetPositionProps extends WidgetRowCols {
  parentColumnSpace: number;
  parentRowSpace: number;
  // The detachFromLayout flag tells use about the following properties when enabled
  // 1) Widget does not drag/resize
  // 2) Widget CAN (but not neccessarily) be a dropTarget
  // Examples: MainContainer is detached from layout,
  // MODAL_WIDGET is also detached from layout.
  detachFromLayout?: boolean;
  noContainerOffset?: boolean; // This won't offset the child in parent
}

export const WIDGET_STATIC_PROPS = {
  leftColumn: true,
  rightColumn: true,
  topRow: true,
  bottomRow: true,
  minHeight: true,
  parentColumnSpace: true,
  parentRowSpace: true,
  children: true,
  type: true,
  widgetId: true,
  widgetName: true,
  parentId: true,
  renderMode: true,
  detachFromLayout: true,
  noContainerOffset: false,
};

export const WIDGET_DISPLAY_PROPS = {
  isVisible: true,
  isLoading: true,
  isDisabled: true,
  backgroundColor: true,
};

export interface WidgetDisplayProps {
  //TODO(abhinav): Some of these props are mandatory
  isVisible?: boolean;
  isLoading: boolean;
  isDisabled?: boolean;
  backgroundColor?: string;
  animateLoading?: boolean;
}

export interface WidgetDataProps
  extends WidgetBaseProps,
    WidgetPositionProps,
    WidgetDisplayProps {}

export interface WidgetProps
  extends WidgetDataProps,
    WidgetDynamicPathListProps,
    DataTreeEvaluationProps {
  key?: string;
  isDefaultClickDisabled?: boolean;
  [key: string]: any;
}

export interface WidgetCardProps {
  type: WidgetType;
  key?: string;
  displayName: string;
  icon: string;
  isBeta?: boolean;
}

export const WidgetOperations = {
  MOVE: "MOVE",
  RESIZE: "RESIZE",
  ADD_CHILD: "ADD_CHILD",
  UPDATE_PROPERTY: "UPDATE_PROPERTY",
  DELETE: "DELETE",
  ADD_CHILDREN: "ADD_CHILDREN",
};

export type WidgetOperation = typeof WidgetOperations[keyof typeof WidgetOperations];

export default BaseWidget;
