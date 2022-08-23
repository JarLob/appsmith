import React, { useCallback, useState } from "react";
import FileAddIcon from "remixicon-react/FileAddLineIcon";
import Database2LineIcon from "remixicon-react/Database2LineIcon";
import Layout2LineIcon from "remixicon-react/Layout2LineIcon";
import { Popover2 } from "@blueprintjs/popover2";
import {
  TooltipComponent as Tooltip,
  Text,
  TextType,
  IconWrapper,
  IconSize,
} from "design-system";
import { EntityClassNames } from "../Entity";
import { TOOLTIP_HOVER_ON_DELAY } from "constants/AppConstants";
import { Position } from "@blueprintjs/core";
import EntityAddButton from "../Entity/AddButton";
import styled from "styled-components";
import history from "utils/history";
import { generateTemplateFormURL } from "RouteBuilder";
import { useParams } from "react-router";
import { useDispatch } from "react-redux";
import { ExplorerURLParams } from "../helpers";
import { showTemplatesModal } from "actions/templateActions";
import { Colors } from "constants/Colors";
import {
  ADD_PAGE_FROM_TEMPLATE,
  ADD_PAGE_TOOLTIP,
  createMessage,
  CREATE_PAGE,
  GENERATE_PAGE_ACTION_TITLE,
} from "@appsmith/constants/messages";
import HotKeys from "../Files/SubmenuHotkeys";

const MenuItem = styled.div<{ active: boolean }>`
  display: flex;
  gap: ${(props) => props.theme.spaces[3]}px;
  height: 36px;
  width: 250px;
  align-items: center;
  padding-left: ${(props) => props.theme.spaces[7]}px;
  cursor: pointer;
  ${(props) => props.active && `background-color: ${Colors.GREY_2};`}

  &:hover {
    background-color: ${Colors.GREY_2};
  }
`;

const Wrapper = styled.div`
  .title {
    display: flex;
    padding: ${(props) =>
      `${props.theme.spaces[4]}px ${props.theme.spaces[7]}px`};
  }
`;

type SubMenuProps = {
  className: string;
  openMenu: boolean;
  onMenuClose: () => void;
  createPageCallback: () => void;
};

function AddPageContextMenu({
  className,
  createPageCallback,
  onMenuClose,
  openMenu,
}: SubMenuProps) {
  const [show, setShow] = useState(openMenu);
  const dispatch = useDispatch();
  const { pageId } = useParams<ExplorerURLParams>();
  const [activeItemIdx, setActiveItemIdx] = useState(0);

  const menuRef = useCallback(
    (node) => {
      if (node && show) {
        node.focus();
      }
    },
    [show],
  );

  const ContextMenuItems = [
    {
      title: createMessage(CREATE_PAGE),
      icon: FileAddIcon,
      onClick: createPageCallback,
      "data-cy": "add-page",
    },
    {
      title: createMessage(GENERATE_PAGE_ACTION_TITLE),
      icon: Database2LineIcon,
      onClick: () => history.push(generateTemplateFormURL({ pageId })),
      "data-cy": "generate-page",
    },
    {
      title: createMessage(ADD_PAGE_FROM_TEMPLATE),
      icon: Layout2LineIcon,
      onClick: () => dispatch(showTemplatesModal(true)),
      "data-cy": "add-page-from-template",
    },
  ];

  const handleUpKey = useCallback(() => {
    setActiveItemIdx((currentActiveIndex) => {
      if (currentActiveIndex <= 0) return ContextMenuItems.length - 1;
      return Math.max(currentActiveIndex - 1, 0);
    });
  }, []);

  const handleDownKey = useCallback(() => {
    setActiveItemIdx((currentActiveIndex) => {
      if (currentActiveIndex >= ContextMenuItems.length - 1) return 0;
      return Math.min(currentActiveIndex + 1, ContextMenuItems.length - 1);
    });
  }, []);

  const handleSelect = () => {
    const item = ContextMenuItems[activeItemIdx];
    onMenuItemClick(item);
  };

  const onMenuItemClick = (item: typeof ContextMenuItems[number]) => {
    setShow(false);
    item.onClick();
  };

  return (
    <Popover2
      className="file-ops"
      content={
        <HotKeys
          handleDownKey={handleDownKey}
          handleSubmitKey={handleSelect}
          handleUpKey={handleUpKey}
        >
          <Wrapper ref={menuRef} tabIndex={0}>
            <Text autofocus className="title" type={TextType.H5}>
              Create New Page
            </Text>
            {ContextMenuItems.map((item, idx) => {
              const MenuIcon = item.icon;

              return (
                <MenuItem
                  active={idx === activeItemIdx}
                  data-cy={item["data-cy"]}
                  key={item.title}
                  onClick={() => onMenuItemClick(item)}
                >
                  <IconWrapper color={Colors.GRAY_700} size={IconSize.XXL}>
                    <MenuIcon />
                  </IconWrapper>
                  <Text color={Colors.MIRAGE} type={TextType.P1}>
                    {item.title}
                  </Text>
                </MenuItem>
              );
            })}
          </Wrapper>
        </HotKeys>
      }
      isOpen={show}
      minimal
      onClose={() => {
        setShow(false);
        onMenuClose();
      }}
      placement="right-start"
    >
      <Tooltip
        boundary="viewport"
        className={EntityClassNames.TOOLTIP}
        content={createMessage(ADD_PAGE_TOOLTIP)}
        disabled={show}
        hoverOpenDelay={TOOLTIP_HOVER_ON_DELAY}
        position={Position.RIGHT}
      >
        <EntityAddButton
          className={`${className} ${show ? "selected" : ""}`}
          onClick={() => setShow(true)}
        />
      </Tooltip>
    </Popover2>
  );
}

export default AddPageContextMenu;
