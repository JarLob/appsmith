import { createMessage, TEMPLATES_BACK_BUTTON } from "ce/constants/messages";
import { Icon, IconSize } from "components/ads";
import { Text, TextType } from "design-system";
import React from "react";
import styled from "styled-components";

const BackButtonWrapper = styled.div<{ width?: number; hidden?: boolean }>`
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: ${(props) => props.theme.spaces[2]}px;
  ${(props) => props.width && `width: ${props.width};`}
  ${(props) => props.hidden && "visibility: hidden;"}
`;

const CloseIcon = styled(Icon)`
  svg {
    height: 24px;
    width: 24px;
  }
`;

type TemplateModalHeaderProps = {
  onBackPress?: () => void;
  onClose: () => void;
  hideBackButton?: boolean;
};

function TemplateModalHeader(props: TemplateModalHeaderProps) {
  return (
    <div className="flex justify-between">
      <BackButtonWrapper
        hidden={props.hideBackButton}
        onClick={props.onBackPress}
      >
        <Icon name="view-less" size={IconSize.XL} />
        <Text type={TextType.P4}>{createMessage(TEMPLATES_BACK_BUTTON)}</Text>
      </BackButtonWrapper>
      <CloseIcon name="close-x" onClick={props.onClose} />
    </div>
  );
}

export default TemplateModalHeader;
